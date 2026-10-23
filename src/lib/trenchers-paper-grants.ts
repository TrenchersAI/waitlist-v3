// =============================================================================
// trenchers-paper-grants — per-day PAPER SOL GIVEN to users, split by approver
// =============================================================================
//
// Powers the analytics page's "Paper SOL given" dashboard: the hand-out twin
// of "Paper volume". Paper volume answers "how much did paper bots trade";
// this answers "how much paper SOL did WE hand out, to whom, and who approved
// it" — the cost side of running the paper programme.
//
// SOURCE: the ops console's `PaperSolRequest` table, read over HTTPS from its
// `GET /api/paper-sol/analytics` feed (bearer `OPS_ANALYTICS_TOKEN`). Every
// "Request sol" tap in the terminal is relayed by st-api to ops, which owns
// the record and the decision. An approval credits the user's paper pool via
// st-api and ONLY THEN marks the row `approved` with `creditedLamports` +
// `decidedAt`, so an approved row is a credit that really landed. Nothing
// else creates paper credits, and the trenchers DB keeps only a running
// per-user total with no date, so this feed is the one place the per-day
// series can come from. (The ops Postgres runs in Docker on the ops box with
// no published port, hence a feed rather than a connection string.)
//
// The feed returns raw rows; everything below is aggregated here. Volume is
// small (one row per request), so pulling the full window and 60s-caching it
// is cheaper and simpler than a bespoke aggregate contract.
//
// The stack is the two ways a grant gets approved:
//   • AUTO     — ops auto-approves a real user's FIRST-EVER request
//                (`autoApproved = true`, decided by the 'auto-approve' marker).
//   • OPERATOR — every later request, decided by a person in the ops desk.
// Together they partition approved grants exactly.
//
// NOT COUNTED: the default paper SEED every user starts with (10 SOL, or the
// admin-set default). It is derived at read time, not granted on a date, so it
// has no event to chart. This dashboard is top-ups only.
//
// Day bucketing is on `decidedAt` (when the SOL actually landed), UTC.
//
// DATA FLOOR: 2026-08-18 — the day the `PaperSolRequest` table (and the
// "Request sol" button) shipped. There are no earlier rows.

import { unstable_cache } from "next/cache";

import { opsOrigin } from "@/src/lib/ops-desk";
import { getTrenchersPool } from "@/src/lib/trenchers-db";

/** First day paper top-ups exist (UTC). */
export const PAPER_GRANTS_FLOOR_ISO = "2026-08-18";

const LAMPORTS_PER_SOL = 1e9;

/** One row of the ops feed. */
type FeedRow = {
  id: string;
  userId: string;
  username: string | null;
  email: string | null;
  wallet: string | null;
  status: string; // pending | approved | rejected
  amountLamports: number;
  creditedLamports: number | null;
  autoApproved: boolean;
  decidedByEmail: string | null;
  decidedAt: string | null; // ISO
  requestedAt: string; // ISO
  note: string | null;
};

type FeedPayload = {
  env: string;
  floor: string;
  since: string;
  requests: FeedRow[];
};

/** One day of the stacked chart: total = auto + operator (all SOL). */
export type PaperGrantDay = {
  date: string; // YYYY-MM-DD (UTC)
  total: number; // SOL handed out that day
  auto: number; // SOL via first-ever auto-approval
  operator: number; // SOL via an operator decision
  grants: number; // approved requests that day
  users: number; // distinct recipients that day
  rejected: number; // requests rejected that day (count)
  requested: number; // requests MADE that day (count, any status)
};

/** Open requests right now, not bucketed by day. */
export type PaperGrantsPending = {
  count: number;
  sol: number;
};

export type PaperGrantsPayload = {
  floor: string;
  days: PaperGrantDay[];
  pending: PaperGrantsPending;
};

/** One recipient on one day — the drill-down behind clicking a bar. */
export type PaperGrantRecipient = {
  userId: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  wallet: string | null;
  /** SOL received THAT day. */
  sol: number;
  /** Approved grants that day. */
  grants: number;
  /** How many of that day's grants were auto-approved (first-ever). */
  autoGrants: number;
  /** Operator emails behind that day's manual approvals (distinct). */
  approvedBy: string[];
  /** Operator notes recorded with the decisions, if any. */
  note: string | null;
  /** Time the last grant of the day landed (ISO, UTC). */
  lastAt: string | null;
  /** Lifetime (through that day): grants + SOL, for the "Nth top-up" badge. */
  lifetimeGrants: number;
  lifetimeSol: number;
};

export type PaperGrantRecipientsPayload = {
  floor: string;
  date: string;
  recipients: PaperGrantRecipient[];
};

/** `YYYY-MM-DD`, and not before the data floor. */
export function isValidPaperGrantDay(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t)) return false;
  return t >= Date.parse(`${PAPER_GRANTS_FLOOR_ISO}T00:00:00Z`);
}

/** The SOL a row actually credited: what st-api confirmed, else the ask. */
function grantSol(r: FeedRow): number {
  return (r.creditedLamports ?? r.amountLamports) / LAMPORTS_PER_SOL;
}

/** UTC day (YYYY-MM-DD) of an ISO timestamp. */
function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

/** Continuous UTC day list from the floor through today (full axis even on
 *  days with no grants). Mirrors `trenchers-analytics.ts`. */
function dayAxis(): string[] {
  const start = new Date(`${PAPER_GRANTS_FLOOR_ISO}T00:00:00Z`);
  const today = new Date();
  const out: string[] = [];
  const cur = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const end = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  while (cur.getTime() <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/** Pull every production request since the floor from the ops feed. Returns
 *  null when the feed is not configured or unreachable, so callers can render
 *  the empty state instead of a crash. */
async function loadFeed(): Promise<FeedRow[] | null> {
  const token = process.env.OPS_ANALYTICS_TOKEN;
  if (!token) return null;
  const url = `${opsOrigin()}/api/paper-sol/analytics?env=production&since=${PAPER_GRANTS_FLOOR_ISO}`;
  try {
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[paper-grants] ops feed HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json()) as FeedPayload;
    return Array.isArray(body.requests) ? body.requests : null;
  } catch (e) {
    console.warn("[paper-grants] ops feed unreachable:", (e as Error).message);
    return null;
  }
}

// 60s cache on the raw feed: both endpoints derive from it, so a bar and its
// drill-down always come from the same snapshot.
const fetchFeed = unstable_cache(loadFeed, ["paper-grants-feed"], {
  revalidate: 60,
});

/** Approved rows with a decision time, i.e. credits that landed. */
function approvedRows(rows: FeedRow[]): (FeedRow & { decidedAt: string })[] {
  return rows.filter(
    (r): r is FeedRow & { decidedAt: string } =>
      r.status === "approved" && r.decidedAt != null,
  );
}

/** Paper SOL handed out per day, split auto vs operator, plus the day's
 *  request/decision counts and the current pending backlog. */
export async function fetchPaperGrants(): Promise<PaperGrantsPayload> {
  const rows = await fetchFeed();
  if (!rows) {
    return { floor: PAPER_GRANTS_FLOOR_ISO, days: [], pending: { count: 0, sol: 0 } };
  }

  const byDay = new Map<string, PaperGrantDay>();
  const recipientsByDay = new Map<string, Set<string>>();
  const dayFor = (date: string): PaperGrantDay => {
    let d = byDay.get(date);
    if (!d) {
      d = {
        date,
        total: 0,
        auto: 0,
        operator: 0,
        grants: 0,
        users: 0,
        rejected: 0,
        requested: 0,
      };
      byDay.set(date, d);
    }
    return d;
  };

  for (const r of rows) {
    dayFor(utcDay(r.requestedAt)).requested += 1;
    if (r.status === "rejected" && r.decidedAt) {
      dayFor(utcDay(r.decidedAt)).rejected += 1;
    }
  }
  for (const r of approvedRows(rows)) {
    const date = utcDay(r.decidedAt);
    const d = dayFor(date);
    const sol = grantSol(r);
    if (r.autoApproved) d.auto += sol;
    else d.operator += sol;
    d.total += sol;
    d.grants += 1;
    let set = recipientsByDay.get(date);
    if (!set) {
      set = new Set();
      recipientsByDay.set(date, set);
    }
    set.add(r.userId);
  }

  const days = dayAxis().map((date) => {
    const d = byDay.get(date);
    const users = recipientsByDay.get(date)?.size ?? 0;
    return d
      ? { ...d, users }
      : {
          date,
          total: 0,
          auto: 0,
          operator: 0,
          grants: 0,
          users: 0,
          rejected: 0,
          requested: 0,
        };
  });

  const pendingRows = rows.filter((r) => r.status === "pending");
  const pending = {
    count: pendingRows.length,
    sol: pendingRows.reduce((a, r) => a + r.amountLamports / LAMPORTS_PER_SOL, 0),
  };

  return { floor: PAPER_GRANTS_FLOOR_ISO, days, pending };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Who received paper SOL on one UTC day, ranked by SOL. Identity comes from
 *  the trenchers `users` table (live username / display name / wallet) when
 *  the id resolves, else from the ops row's denormalised copy. */
export async function fetchPaperGrantRecipientsForDay(
  date: string,
): Promise<PaperGrantRecipient[]> {
  const rows = await fetchFeed();
  if (!rows) return [];

  const approved = approvedRows(rows);
  const dayEnd = `${date}T23:59:59.999Z`;

  // Lifetime through the END of that day, per user, for the Nth-top-up badge.
  const lifetime = new Map<string, { grants: number; sol: number }>();
  for (const r of approved) {
    if (r.decidedAt > dayEnd) continue;
    const l = lifetime.get(r.userId) ?? { grants: 0, sol: 0 };
    l.grants += 1;
    l.sol += grantSol(r);
    lifetime.set(r.userId, l);
  }

  const byUser = new Map<string, PaperGrantRecipient>();
  const approvers = new Map<string, Set<string>>();
  const notes = new Map<string, Set<string>>();
  for (const r of approved) {
    if (utcDay(r.decidedAt) !== date) continue;
    let rec = byUser.get(r.userId);
    if (!rec) {
      const life = lifetime.get(r.userId) ?? { grants: 0, sol: 0 };
      rec = {
        userId: r.userId,
        username: r.username,
        displayName: null,
        email: r.email,
        wallet: r.wallet,
        sol: 0,
        grants: 0,
        autoGrants: 0,
        approvedBy: [],
        note: null,
        lastAt: null,
        lifetimeGrants: life.grants,
        lifetimeSol: life.sol,
      };
      byUser.set(r.userId, rec);
    }
    rec.sol += grantSol(r);
    rec.grants += 1;
    if (r.autoApproved) rec.autoGrants += 1;
    if (!rec.lastAt || r.decidedAt > rec.lastAt) rec.lastAt = r.decidedAt;
    // Prefer any non-null identity the ops copy has across the day's rows.
    rec.username ??= r.username;
    rec.email ??= r.email;
    rec.wallet ??= r.wallet;
    if (!r.autoApproved) {
      if (r.decidedByEmail) {
        let set = approvers.get(r.userId);
        if (!set) {
          set = new Set();
          approvers.set(r.userId, set);
        }
        set.add(r.decidedByEmail);
      }
      if (r.note) {
        let set = notes.get(r.userId);
        if (!set) {
          set = new Set();
          notes.set(r.userId, set);
        }
        set.add(r.note);
      }
    }
  }
  for (const [userId, rec] of byUser) {
    rec.approvedBy = [...(approvers.get(userId) ?? [])];
    const n = notes.get(userId);
    rec.note = n && n.size > 0 ? [...n].join(" · ") : null;
  }

  // Live identity from the trading backend, where the user record actually
  // lives. Best-effort: a missing pool or a failed lookup leaves the ops copy.
  const ids = [...byUser.keys()].filter((id) => UUID_RE.test(id));
  const trenchers = getTrenchersPool();
  if (trenchers && ids.length > 0) {
    try {
      const u = await trenchers.query<{
        id: string;
        username: string | null;
        display_name: string | null;
        wallet_address: string | null;
      }>(
        `SELECT id, username, display_name, wallet_address
           FROM users
          WHERE id = ANY($1::uuid[])`,
        [ids],
      );
      for (const r of u.rows) {
        const rec = byUser.get(r.id);
        if (!rec) continue;
        rec.username = r.username ?? rec.username;
        rec.displayName = r.display_name;
        rec.wallet = r.wallet_address ?? rec.wallet;
      }
    } catch (e) {
      console.warn(
        "[paper-grants] identity lookup failed, using ops copy:",
        (e as Error).message,
      );
    }
  }

  return [...byUser.values()].sort(
    (a, b) => b.sol - a.sol || (b.lastAt ?? "").localeCompare(a.lastAt ?? ""),
  );
}
