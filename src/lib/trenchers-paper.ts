// =============================================================================
// trenchers-paper — per-day PAPER BOT trading volume, split buys vs sells
// =============================================================================
//
// Powers the analytics page's "Paper volume" dashboard: the paper-only twin of
// the Trading volume dashboard (`trenchers-analytics.ts`). Same source table
// (`bot_trades`), same prod DB (`trenchers-db.ts`), same SOL denomination
// (`sol_amount` is lamports → / 1e9 at the query edge), same data floor.
//
// The ONE difference is the paper guard, inverted: Trading volume keeps
// `signature NOT LIKE 'paper%'` (real on-chain fills); this file keeps
// `signature LIKE 'paper%'` — paper fills carry a synthetic
// 'paper-buy:' / 'paper-sell:' signature instead of a base58 one. Filtering
// per-trade by signature (not by a bot's *current* `paper_mode` flag) means a
// bot later flipped between paper and live never rewrites its history, and
// the two dashboards partition `bot_trades` exactly: every confirmed bot fill
// is in one or the other, never both.
//
// Paper has no manual leg (manual trading is always live), so the stack is
// buys vs sells — the natural split of a bot's paper activity.
//
// DATA FLOOR: shared with the trading dashboards (2026-07-25, the day the
// paper/live split went live).

import { unstable_cache } from "next/cache";

import { TRADING_FLOOR_ISO } from "@/src/lib/trenchers-analytics";
import { getTrenchersPool } from "@/src/lib/trenchers-db";

/** One day of the stacked chart: total = buy + sell (all SOL, paper only). */
export type PaperDay = {
  date: string; // YYYY-MM-DD (UTC)
  total: number;
  buy: number;
  sell: number;
};

/** One row of the per-user breakdown for a day. */
export type PaperTraderRow = {
  userId: string | null;
  username: string | null;
  displayName: string | null;
  wallet: string | null;
  trades: number;
  volumeSol: number;
  bots: number;
  pnlSol: number;
  lastTradeAt: string | null;
};

function num(v: unknown): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Continuous UTC day list from the floor through today (full axis even on
 *  days with no paper trading). Mirrors `trenchers-analytics.ts`. */
function dayAxis(): string[] {
  const start = new Date(`${TRADING_FLOOR_ISO}T00:00:00Z`);
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

/** Paper bot VOLUME per day (SOL), split by side. */
async function loadPaperVolume(): Promise<PaperDay[]> {
  const pool = getTrenchersPool();
  if (!pool) return [];

  const rows = await pool.query<{ date: string; side: string; sol: string }>(
    `SELECT to_char(date(created_at), 'YYYY-MM-DD') AS date,
            side,
            sum(sol_amount) / 1e9 AS sol
       FROM bot_trades
      WHERE status = 'confirmed'
        AND signature LIKE 'paper%'
        AND created_at >= $1::date
      GROUP BY 1, 2`,
    [TRADING_FLOOR_ISO],
  );

  const buyByDay = new Map<string, number>();
  const sellByDay = new Map<string, number>();
  for (const r of rows.rows) {
    if (r.side === "buy") buyByDay.set(r.date, num(r.sol));
    else if (r.side === "sell") sellByDay.set(r.date, num(r.sol));
  }
  return dayAxis().map((date) => {
    const buy = buyByDay.get(date) ?? 0;
    const sell = sellByDay.get(date) ?? 0;
    return { date, buy, sell, total: buy + sell };
  });
}

// 60s cache, same as the trading dashboards: a full-table aggregate the page
// doesn't need sub-minute freshness on.
export const fetchPaperVolume = unstable_cache(
  loadPaperVolume,
  ["paper-volume"],
  { revalidate: 60 },
);

// One user can run many bots with a huge number of paper fills; we only ever
// render a leaderboard, so cap well above what the table shows.
const LIMIT = 500;

/** Per-user paper bot breakdown for one UTC day — the drill-down behind
 *  clicking a bar. Mirrors `fetchTradersForDay`'s bot leg with the paper guard
 *  inverted, so a day's rows reconcile with that day's bar. Deliberately NOT
 *  `unstable_cache`d: that helper keys on static keyParts, not the date
 *  argument, and every day would collide into one entry. */
export async function fetchPaperTradersForDay(
  date: string,
): Promise<PaperTraderRow[]> {
  const pool = getTrenchersPool();
  if (!pool) return [];

  const q = await pool.query<{
    user_id: string | null;
    username: string | null;
    display_name: string | null;
    wallet_address: string | null;
    trades: string;
    bots: string;
    volume_sol: string;
    pnl_sol: string;
    last_trade_at: string | null;
  }>(
    `SELECT bt.user_id,
            u.username,
            u.display_name,
            u.wallet_address,
            count(*)                              AS trades,
            count(DISTINCT bt.bot_id)             AS bots,
            sum(bt.sol_amount) / 1e9              AS volume_sol,
            sum(COALESCE(bt.pnl_lamports, 0) - bt.fees_lamports) / 1e9 AS pnl_sol,
            max(bt.created_at)                    AS last_trade_at
       FROM bot_trades bt
       LEFT JOIN users u ON u.id = bt.user_id
      WHERE bt.status = 'confirmed'
        AND bt.signature LIKE 'paper%'
        AND bt.created_at >= $1::date
        AND bt.created_at <  ($1::date + INTERVAL '1 day')
      GROUP BY bt.user_id, u.username, u.display_name, u.wallet_address
      ORDER BY volume_sol DESC NULLS LAST
      LIMIT ${LIMIT}`,
    [date],
  );

  return q.rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    displayName: r.display_name,
    wallet: r.wallet_address,
    trades: num(r.trades),
    volumeSol: num(r.volume_sol),
    bots: num(r.bots),
    pnlSol: num(r.pnl_sol),
    lastTradeAt: r.last_trade_at,
  }));
}
