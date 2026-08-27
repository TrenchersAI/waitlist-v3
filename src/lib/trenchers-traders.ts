// =============================================================================
// trenchers-traders — per-USER volume breakdown, manual vs bot
// =============================================================================
//
// Powers the "who traded" drill-down on the Trading volume dashboard: click the
// Manual (or Bot) headline card and get the ranked list of users behind that
// number. Same source + same correctness guards as `trenchers-analytics.ts`
// (the card totals these rows sum to are computed there), so the two always
// reconcile:
//
//   • LIVE, CONFIRMED FILLS ONLY — `status = 'confirmed'` AND
//     `signature NOT LIKE 'paper%'` (paper fills carry a synthetic 'paper%'
//     signature; excluding by signature, not by a bot's current paper_mode
//     flag, means flipping a bot to paper never rewrites its history).
//   • LAMPORTS → SOL AT THE QUERY EDGE for bot volume (`sol_amount` / 1e9).
//     Manual volume is the SOL leg of the swap (`input_amount` on a buy,
//     `output_amount` on a sell), already in SOL.
//
// Identity is resolved by LEFT JOIN onto `users` so a user_id with no row (or a
// null user_id on a legacy fill) still shows up — we just render the wallet /
// short id instead of a username.
//
// DATA FLOOR: reused from `trenchers-analytics.ts` (2026-07-25).

import { unstable_cache } from "next/cache";

import { TRADING_FLOOR_ISO } from "@/src/lib/trenchers-analytics";
import { getTrenchersPool } from "@/src/lib/trenchers-db";

/** One row of the per-user breakdown. `bots` / `pnlSol` are only populated for
 *  the bot list; the manual list leaves them null. */
export type TraderRow = {
  userId: string | null;
  username: string | null;
  displayName: string | null;
  wallet: string | null;
  trades: number;
  volumeSol: number;
  bots: number | null;
  pnlSol: number | null;
  lastTradeAt: string | null;
};

export type TradersPayload = {
  floor: string;
  manual: TraderRow[];
  bot: TraderRow[];
};

function num(v: unknown): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

// A single user can trade with a huge number of fills; we only ever render a
// leaderboard, so cap each list. 500 is far beyond what the table shows but
// keeps the payload bounded if the user base grows.
const LIMIT = 500;

async function loadTraders(): Promise<Omit<TradersPayload, "floor">> {
  const pool = getTrenchersPool();
  if (!pool) return { manual: [], bot: [] };

  // Bot volume per user — mirrors `loadVolume`'s bot leg, grouped by user and
  // joined to identity. `pnl_lamports` sums to realized PnL (only sells carry
  // it). `count(DISTINCT bot_id)` = how many of their bots actually fired.
  const botQ = pool.query<{
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
            sum(bt.pnl_lamports) / 1e9            AS pnl_sol,
            max(bt.created_at)                    AS last_trade_at
       FROM bot_trades bt
       LEFT JOIN users u ON u.id = bt.user_id
      WHERE bt.status = 'confirmed'
        AND bt.signature NOT LIKE 'paper%'
        AND bt.created_at >= $1::date
      GROUP BY bt.user_id, u.username, u.display_name, u.wallet_address
      ORDER BY volume_sol DESC NULLS LAST
      LIMIT ${LIMIT}`,
    [TRADING_FLOOR_ISO],
  );

  // Manual volume per user — mirrors `loadVolume`'s manual leg (SOL-quoted
  // swaps only), grouped by user and joined to identity.
  const manualQ = pool.query<{
    user_id: string | null;
    username: string | null;
    display_name: string | null;
    wallet_address: string | null;
    trades: string;
    volume_sol: string;
    last_trade_at: string | null;
  }>(
    `SELECT t.user_id,
            u.username,
            u.display_name,
            u.wallet_address,
            count(*)                                                          AS trades,
            sum(CASE WHEN t.side = 'buy' THEN t.input_amount
                     ELSE t.output_amount END)                               AS volume_sol,
            max(t.created_at)                                                AS last_trade_at
       FROM trades t
       LEFT JOIN users u ON u.id = t.user_id
      WHERE t.quote_mint LIKE 'So111%'
        AND t.status = 'confirmed'
        AND t.signature NOT LIKE 'paper%'
        AND t.created_at >= $1::date
      GROUP BY t.user_id, u.username, u.display_name, u.wallet_address
      ORDER BY volume_sol DESC NULLS LAST
      LIMIT ${LIMIT}`,
    [TRADING_FLOOR_ISO],
  );

  const [bot, manual] = await Promise.all([botQ, manualQ]);

  return {
    bot: bot.rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      displayName: r.display_name,
      wallet: r.wallet_address,
      trades: num(r.trades),
      volumeSol: num(r.volume_sol),
      bots: num(r.bots),
      pnlSol: num(r.pnl_sol),
      lastTradeAt: r.last_trade_at,
    })),
    manual: manual.rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      displayName: r.display_name,
      wallet: r.wallet_address,
      trades: num(r.trades),
      volumeSol: num(r.volume_sol),
      bots: null,
      pnlSol: null,
      lastTradeAt: r.last_trade_at,
    })),
  };
}

// 60s cache, matching the volume/revenue aggregates this drills into.
export const fetchTradingTraders = unstable_cache(
  loadTraders,
  ["trading-traders"],
  { revalidate: 60 },
);
