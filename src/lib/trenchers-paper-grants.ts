// =============================================================================
// trenchers-paper-grants — per-day PAPER SOL GIVEN to users, split by approver
// =============================================================================
//
// Powers the analytics page's "Paper SOL given" dashboard: the hand-out twin
// of "Paper volume". Paper volume answers "how much did paper bots trade";
// this answers "how much paper SOL did WE hand out, to whom, and who approved
// it" — the cost side of running the paper programme.
//
// SOURCE: the ops console's `PaperSolRequest` table (`ops-db.ts`). Every
// "Request sol" tap in the terminal is relayed by st-api to ops, which owns
// the record and the decision. An approval credits the user's paper pool via
// st-api (`POST /admin/paper-wallet/credit`) and ONLY THEN marks the row
// `approved` with `creditedLamports` + `decidedAt`, so an approved row is a
// credit that really landed. Nothing else creates paper credits, and the
// trenchers DB keeps only a running per-user total with no date, so this
// table is the one place the per-day series can come from.
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
// Day bucketing is on `decidedAt` (when the SOL actually landed), UTC. Prisma
// stores timestamps in UTC, so `date()` on the column is a UTC day.
//
// ENV: production only (`env = 'production'`) — staging asks credit a
// different backend and are not real hand-outs.
//
// DATA FLOOR: 2026-08-18 — the day the `PaperSolRequest` table (and the
// "Request sol" button) shipped. There are no earlier rows.

import { unstable_cache } from "next/cache";

import { getOpsPool } from "@/src/lib/ops-db";
import { getTrenchersPool } from "@/src/lib/trenchers-db";

/** First day paper top-ups exist (UTC). */
export const PAPER_GRANTS_FLOOR_ISO = "2026-08-18";

/** Which ops environment's rows count as real hand-outs. */
const OPS_ENV = "production";

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

function num(v: unknown): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** `YYYY-MM-DD`, and not before the data floor. */
export function isValidPaperGrantDay(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t)) return false;
  return t >= Date.parse(`${PAPER_GRANTS_FLOOR_ISO}T00:00:00Z`);
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

/** Paper SOL handed out per day, split auto vs operator, plus the day's
 *  request/decision counts and the current pending backlog. */
async function loadPaperGrants(): Promise<PaperGrantsPayload> {
  const pool = getOpsPool();
  const empty: PaperGrantsPayload = {
    floor: PAPER_GRANTS_FLOOR_ISO,
    days: [],
    pending: { count: 0, sol: 0 },
  };
  if (!pool) return empty;

  // Approved grants by decision day and approver kind. `creditedLamports` is
  // what st-api confirmed it credited; it equals `amountLamports` today but is
  // the honest figure, so prefer it and fall back only for a legacy null.
  const approved = await pool.query<{
    date: string;
    auto: boolean;
    grants: string;
    sol: string;
  }>(
    `SELECT to_char(date("decidedAt"), 'YYYY-MM-DD')               AS date,
            "autoApproved"                                           AS auto,
            count(*)                                                 AS grants,
            sum(COALESCE("creditedLamports", "amountLamports")) / 1e9 AS sol
       FROM "PaperSolRequest"
      WHERE env = $1
        AND status = 'approved'
        AND "decidedAt" IS NOT NULL
        AND "decidedAt" >= $2::date
      GROUP BY 1, 2`,
    [OPS_ENV, PAPER_GRANTS_FLOOR_ISO],
  );

  // Distinct recipients per day across BOTH kinds (a user can't be both on
  // one day in practice, but count it right regardless).
  const usersByDay = await pool.query<{ date: string; users: string }>(
    `SELECT to_char(date("decidedAt"), 'YYYY-MM-DD') AS date,
            count(DISTINCT "userId")                   AS users
       FROM "PaperSolRequest"
      WHERE env = $1
        AND status = 'approved'
        AND "decidedAt" IS NOT NULL
        AND "decidedAt" >= $2::date
      GROUP BY 1`,
    [OPS_ENV, PAPER_GRANTS_FLOOR_ISO],
  );

  const rejected = await pool.query<{ date: string; n: string }>(
    `SELECT to_char(date("decidedAt"), 'YYYY-MM-DD') AS date, count(*) AS n
       FROM "PaperSolRequest"
      WHERE env = $1
        AND status = 'rejected'
        AND "decidedAt" IS NOT NULL
        AND "decidedAt" >= $2::date
      GROUP BY 1`,
    [OPS_ENV, PAPER_GRANTS_FLOOR_ISO],
  );

  const requested = await pool.query<{ date: string; n: string }>(
    `SELECT to_char(date("requestedAt"), 'YYYY-MM-DD') AS date, count(*) AS n
       FROM "PaperSolRequest"
      WHERE env = $1
        AND "requestedAt" >= $2::date
      GROUP BY 1`,
    [OPS_ENV, PAPER_GRANTS_FLOOR_ISO],
  );

  const pending = await pool.query<{ n: string; sol: string }>(
    `SELECT count(*) AS n, COALESCE(sum("amountLamports"), 0) / 1e9 AS sol
       FROM "PaperSolRequest"
      WHERE env = $1 AND status = 'pending'`,
    [OPS_ENV],
  );

  const autoByDay = new Map<string, { sol: number; grants: number }>();
  const opByDay = new Map<string, { sol: number; grants: number }>();
  for (const r of approved.rows) {
    const target = r.auto ? autoByDay : opByDay;
    target.set(r.date, { sol: num(r.sol), grants: num(r.grants) });
  }
  const recipientsByDay = new Map<string, number>();
  for (const r of usersByDay.rows) recipientsByDay.set(r.date, num(r.users));
  const rejectedByDay = new Map<string, number>();
  for (const r of rejected.rows) rejectedByDay.set(r.date, num(r.n));
  const requestedByDay = new Map<string, number>();
  for (const r of requested.rows) requestedByDay.set(r.date, num(r.n));

  const days = dayAxis().map((date) => {
    const a = autoByDay.get(date);
    const o = opByDay.get(date);
    const auto = a?.sol ?? 0;
    const operator = o?.sol ?? 0;
    return {
      date,
      auto,
      operator,
      total: auto + operator,
      grants: (a?.grants ?? 0) + (o?.grants ?? 0),
      users: recipientsByDay.get(date) ?? 0,
      rejected: rejectedByDay.get(date) ?? 0,
      requested: requestedByDay.get(date) ?? 0,
    };
  });

  const p = pending.rows[0];
  return {
    floor: PAPER_GRANTS_FLOOR_ISO,
    days,
    pending: { count: num(p?.n), sol: num(p?.sol) },
  };
}

// 60s cache, same as the trading dashboards.
export const fetchPaperGrants = unstable_cache(
  loadPaperGrants,
  ["paper-grants"],
  { revalidate: 60 },
);

// Recipients per day is tiny in practice; the cap is a safety net.
const LIMIT = 500;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Who received paper SOL on one UTC day, ranked by SOL. Identity comes from
 *  the trenchers `users` table (live username / display name / wallet) when
 *  the id resolves, else from the ops row's denormalised copy. Deliberately
 *  NOT `unstable_cache`d: that helper keys on static keyParts, not the date
 *  argument, so every day would collide into one entry. */
export async function fetchPaperGrantRecipientsForDay(
  date: string,
): Promise<PaperGrantRecipient[]> {
  const pool = getOpsPool();
  if (!pool) return [];

  const q = await pool.query<{
    user_id: string;
    username: string | null;
    email: string | null;
    wallet: string | null;
    sol: string;
    grants: string;
    auto_grants: string;
    approved_by: string[] | null;
    note: string | null;
    // `pg` hands a timestamptz back as a Date; typed loosely so a text cast
    // elsewhere can't break the ISO conversion below.
    last_at: Date | string | null;
    lifetime_grants: string;
    lifetime_sol: string;
  }>(
    `WITH day AS (
       SELECT "userId"                                                  AS user_id,
              max("username")                                           AS username,
              max("email")                                              AS email,
              max("wallet")                                             AS wallet,
              sum(COALESCE("creditedLamports", "amountLamports")) / 1e9 AS sol,
              count(*)                                                  AS grants,
              count(*) FILTER (WHERE "autoApproved")                    AS auto_grants,
              array_remove(
                array_agg(DISTINCT "decidedByEmail")
                  FILTER (WHERE NOT "autoApproved"),
                NULL
              )                                                         AS approved_by,
              string_agg(DISTINCT "note", ' · ')
                FILTER (WHERE "note" IS NOT NULL AND NOT "autoApproved") AS note,
              (max("decidedAt") AT TIME ZONE 'UTC')                     AS last_at
         FROM "PaperSolRequest"
        WHERE env = $1
          AND status = 'approved'
          AND "decidedAt" >= $2::date
          AND "decidedAt" <  ($2::date + INTERVAL '1 day')
        GROUP BY "userId"
     )
     SELECT day.*,
            life.n   AS lifetime_grants,
            life.sol AS lifetime_sol
       FROM day
       JOIN LATERAL (
         SELECT count(*) AS n,
                sum(COALESCE("creditedLamports", "amountLamports")) / 1e9 AS sol
           FROM "PaperSolRequest" p
          WHERE p."userId" = day.user_id
            AND p.env = $1
            AND p.status = 'approved'
            AND p."decidedAt" < ($2::date + INTERVAL '1 day')
       ) life ON true
      ORDER BY day.sol DESC, day.last_at DESC
      LIMIT ${LIMIT}`,
    [OPS_ENV, date],
  );

  // Live identity from the trading backend, where the user record actually
  // lives. Best-effort: a missing pool or a failed lookup leaves the ops copy.
  const ids = q.rows.map((r) => r.user_id).filter((id) => UUID_RE.test(id));
  const identity = new Map<
    string,
    { username: string | null; displayName: string | null; wallet: string | null }
  >();
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
        identity.set(r.id, {
          username: r.username,
          displayName: r.display_name,
          wallet: r.wallet_address,
        });
      }
    } catch (e) {
      console.warn(
        "[paper-grants] identity lookup failed, using ops copy:",
        (e as Error).message,
      );
    }
  }

  return q.rows.map((r) => {
    const live = identity.get(r.user_id);
    const lastAt =
      r.last_at == null
        ? null
        : r.last_at instanceof Date
          ? r.last_at.toISOString()
          : new Date(r.last_at).toISOString();
    return {
      userId: r.user_id,
      username: live?.username ?? r.username,
      displayName: live?.displayName ?? null,
      email: r.email,
      wallet: live?.wallet ?? r.wallet,
      sol: num(r.sol),
      grants: num(r.grants),
      autoGrants: num(r.auto_grants),
      approvedBy: r.approved_by ?? [],
      note: r.note,
      lastAt,
      lifetimeGrants: num(r.lifetime_grants),
      lifetimeSol: num(r.lifetime_sol),
    };
  });
}
