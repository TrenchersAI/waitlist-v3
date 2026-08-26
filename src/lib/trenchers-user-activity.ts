// =============================================================================
// trenchers-user-activity — daily active users + daily active bots (prod DB)
// =============================================================================
//
// Powers the analytics page's "User activity" section (two dashboards behind a
// Users | Bots toggle). Reads the trenchers prod DB (see `trenchers-db.ts`),
// the same reader the Trading dashboards use — no PostHog dependency.
//
// DEFINITIONS (all live-only; paper trades excluded per-row by their synthetic
// 'paper%' signature, matching the Trading dashboards):
//   • Active user (day)  — a distinct user who either placed a confirmed manual
//                          trade OR owns a bot that placed a confirmed trade
//                          that UTC day. This is a genuine DAU, not a signup.
//   • New user (day)     — a distinct account created that UTC day
//                          (users.created_at). This is the product-signup line.
//   • Active bot (day)   — a distinct bot that placed a confirmed live trade
//                          that UTC day.
//   • Active bots (now)  — bots currently in state='active' (live vs paper).
//
// DATA FLOOR: 2026-07-10 — the first product user / first manual trade. Days
// before that don't exist; the axis starts here so "All" isn't padded with a
// long empty tail.

import { unstable_cache } from "next/cache";

import { getTrenchersPool } from "@/src/lib/trenchers-db";

/** First day with product data (UTC). */
export const USER_ACTIVITY_FLOOR_ISO = "2026-07-10";

/** One point on a daily series. */
export type DayPoint = { date: string; count: number };

/** Snapshot of bots currently in the 'active' state. */
export type CurrentBots = { live: number; paper: number };

export type UserActivityPayload = {
  floor: string;
  /** Users dashboard: active (DAU) + new signups, both on the full day axis. */
  users: {
    activeByDay: DayPoint[];
    newByDay: DayPoint[];
    totalUsers: number;
  };
  /** Bots dashboard: distinct bots that traded per day + a live "now" count. */
  bots: {
    activeByDay: DayPoint[];
    currentActive: CurrentBots;
    totalLiveBots: number;
  };
};

function num(v: unknown): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Continuous UTC day list from the floor through today, so each chart has a
 *  full axis even on days with no activity. */
function dayAxis(): string[] {
  const start = new Date(`${USER_ACTIVITY_FLOOR_ISO}T00:00:00Z`);
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

/** Merge a sparse per-day count map onto the full day axis. */
function onAxis(byDay: Map<string, number>): DayPoint[] {
  return dayAxis().map((date) => ({ date, count: byDay.get(date) ?? 0 }));
}

function toMap(rows: { date: string; count: string }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.date, num(r.count));
  return m;
}

async function load(): Promise<UserActivityPayload> {
  const pool = getTrenchersPool();
  const empty: UserActivityPayload = {
    floor: USER_ACTIVITY_FLOOR_ISO,
    users: { activeByDay: [], newByDay: [], totalUsers: 0 },
    bots: {
      activeByDay: [],
      currentActive: { live: 0, paper: 0 },
      totalLiveBots: 0,
    },
  };
  if (!pool) return empty;

  const floor = USER_ACTIVITY_FLOOR_ISO;

  const [activeUsers, newUsers, activeBots, currentBots, totals] =
    await Promise.all([
      // Distinct active users per day: manual traders UNION bot owners whose
      // bot traded. `paper%` guard drops simulated fills on both legs.
      pool.query<{ date: string; count: string }>(
        `WITH activity AS (
             SELECT date(created_at) AS d, user_id
               FROM trades
              WHERE status = 'confirmed'
                AND signature NOT LIKE 'paper%'
                AND created_at >= $1::date
             UNION
             SELECT date(bt.created_at) AS d, b.user_id
               FROM bot_trades bt
               JOIN bots b ON b.id = bt.bot_id
              WHERE bt.status = 'confirmed'
                AND bt.signature NOT LIKE 'paper%'
                AND bt.created_at >= $1::date
           )
           SELECT to_char(d, 'YYYY-MM-DD') AS date,
                  count(DISTINCT user_id) AS count
             FROM activity
            GROUP BY 1`,
        [floor],
      ),
      // New product accounts per day.
      pool.query<{ date: string; count: string }>(
        `SELECT to_char(date(created_at), 'YYYY-MM-DD') AS date,
                count(*) AS count
           FROM users
          WHERE created_at >= $1::date
          GROUP BY 1`,
        [floor],
      ),
      // Distinct live bots that placed a confirmed trade per day.
      pool.query<{ date: string; count: string }>(
        `SELECT to_char(date(created_at), 'YYYY-MM-DD') AS date,
                count(DISTINCT bot_id) AS count
           FROM bot_trades
          WHERE status = 'confirmed'
            AND signature NOT LIKE 'paper%'
            AND created_at >= $1::date
          GROUP BY 1`,
        [floor],
      ),
      // Live "now" snapshot: bots currently in the active state.
      pool.query<{ live: string; paper: string }>(
        `SELECT count(*) FILTER (WHERE NOT paper_mode) AS live,
                count(*) FILTER (WHERE paper_mode)     AS paper
           FROM bots
          WHERE state = 'active'`,
      ),
      // All-time headline totals.
      pool.query<{ total_users: string; total_live_bots: string }>(
        `SELECT (SELECT count(*) FROM users) AS total_users,
                (SELECT count(*) FROM bots WHERE NOT paper_mode) AS total_live_bots`,
      ),
    ]);

  const cur = currentBots.rows[0];
  const tot = totals.rows[0];

  return {
    floor,
    users: {
      activeByDay: onAxis(toMap(activeUsers.rows)),
      newByDay: onAxis(toMap(newUsers.rows)),
      totalUsers: num(tot?.total_users),
    },
    bots: {
      activeByDay: onAxis(toMap(activeBots.rows)),
      currentActive: { live: num(cur?.live), paper: num(cur?.paper) },
      totalLiveBots: num(tot?.total_live_bots),
    },
  };
}

// 60s cache — mirrors the trading aggregates. The "now" bot count is a little
// stale under this, which is fine for a team dashboard.
export const fetchUserActivity = unstable_cache(load, ["user-activity"], {
  revalidate: 60,
});
