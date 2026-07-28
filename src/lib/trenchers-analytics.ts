// =============================================================================
// trenchers-analytics — per-day trading VOLUME + REVENUE, split bot vs manual
// =============================================================================
//
// Powers the analytics page's two Trading dashboards. Reads the trenchers prod
// DB (see `trenchers-db.ts`). Everything is denominated in SOL — the DB stores
// bot trade size (`bot_trades.sol_amount`, lamports) and fees
// (`fee_ledger.fee_lamports`) natively in SOL, so no price feed is needed and
// the numbers reconcile exactly against on-chain. Manual trades are all
// SOL-quoted today; the SOL leg is `input_amount` on a buy / `output_amount` on
// a sell.
//
// DATA FLOOR: 2026-07-25 — the day the paper/live split + the corrected fee
// recording went live. Earlier data is pre-fix and excluded on purpose.

import { unstable_cache } from "next/cache";

import { getTrenchersPool } from "@/src/lib/trenchers-db";

/** First day of trustworthy data (UTC). */
export const TRADING_FLOOR_ISO = "2026-07-25";

/** One day of a stacked chart: total = bot + manual (all SOL). */
export type TradingDay = {
  date: string; // YYYY-MM-DD (UTC)
  total: number;
  bot: number;
  manual: number;
};

function num(v: unknown): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Continuous UTC day list from the floor through today, so the chart has a
 *  full axis even on days with no trading. */
function dayAxis(): string[] {
  const start = new Date(`${TRADING_FLOOR_ISO}T00:00:00Z`);
  const today = new Date();
  const out: string[] = [];
  const cur = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
    ),
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

/** Merge sparse per-day (bot, manual) maps onto the full day axis. */
function assemble(
  botByDay: Map<string, number>,
  manualByDay: Map<string, number>,
): TradingDay[] {
  return dayAxis().map((date) => {
    const bot = botByDay.get(date) ?? 0;
    const manual = manualByDay.get(date) ?? 0;
    return { date, bot, manual, total: bot + manual };
  });
}

/** Trading VOLUME per day (SOL): bot = live bot_trades size; manual = the SOL
 *  leg of each manual swap. */
async function loadVolume(): Promise<TradingDay[]> {
  const pool = getTrenchersPool();
  if (!pool) return [];

  // Live bot trade volume. Paper trades are excluded PER-TRADE by their
  // synthetic signature ('paper-buy:' / 'paper-sell:') — real on-chain fills
  // carry a base58 signature. This is immune to a bot later flipping its
  // `paper_mode` flag (a bots-join on the *current* flag would retroactively
  // re-label all of that bot's historical trades). `NOT LIKE 'paper%'` also
  // drops any NULL-signature row, which we don't want to count as live either.
  const botRows = await pool.query<{ date: string; bot: string }>(
    `SELECT to_char(date(created_at), 'YYYY-MM-DD') AS date,
            sum(sol_amount) / 1e9 AS bot
       FROM bot_trades
      WHERE status = 'confirmed'
        AND signature NOT LIKE 'paper%'
        AND created_at >= $1::date
      GROUP BY 1`,
    [TRADING_FLOOR_ISO],
  );

  // Manual swaps — all SOL-quoted today; the SOL notional is the input on a
  // buy, the output on a sell. Same paper guard for safety (manual paper fills,
  // if ever recorded here, would carry a synthetic signature too).
  const manualRows = await pool.query<{ date: string; manual: string }>(
    `SELECT to_char(date(created_at), 'YYYY-MM-DD') AS date,
            sum(CASE WHEN side = 'buy' THEN input_amount ELSE output_amount END) AS manual
       FROM trades
      WHERE quote_mint LIKE 'So111%'
        AND status = 'confirmed'
        AND signature NOT LIKE 'paper%'
        AND created_at >= $1::date
      GROUP BY 1`,
    [TRADING_FLOOR_ISO],
  );

  const botByDay = new Map<string, number>();
  for (const r of botRows.rows) botByDay.set(r.date, num(r.bot));
  const manualByDay = new Map<string, number>();
  for (const r of manualRows.rows) manualByDay.set(r.date, num(r.manual));
  return assemble(botByDay, manualByDay);
}

/** Trading REVENUE per day (SOL) from the canonical `fee_ledger`, split by
 *  `kind` (bot vs manual). Only SOL-denominated fees, and only REAL fills —
 *  paper bots write fee_ledger rows too (with a synthetic 'paper%' signature),
 *  which are fake revenue and must be excluded per-trade. */
async function loadRevenue(): Promise<TradingDay[]> {
  const pool = getTrenchersPool();
  if (!pool) return [];

  const rows = await pool.query<{ date: string; kind: string; sol: string }>(
    `SELECT to_char(date(created_at), 'YYYY-MM-DD') AS date,
            kind,
            sum(fee_lamports) / 1e9 AS sol
       FROM fee_ledger
      WHERE fee_token = 'SOL'
        AND signature NOT LIKE 'paper%'
        AND created_at >= $1::date
      GROUP BY 1, 2`,
    [TRADING_FLOOR_ISO],
  );

  const botByDay = new Map<string, number>();
  const manualByDay = new Map<string, number>();
  for (const r of rows.rows) {
    if (r.kind === "bot") botByDay.set(r.date, num(r.sol));
    else if (r.kind === "manual") manualByDay.set(r.date, num(r.sol));
    // order/sniper/copytrade kinds fold into neither series here — the two
    // dashboards are deliberately bot vs manual.
  }
  return assemble(botByDay, manualByDay);
}

// 60s cache: these are heavy-ish cross-DB aggregates and the dashboard doesn't
// need sub-minute freshness. Mirrors the referrals stats' caching.
export const fetchTradingVolume = unstable_cache(loadVolume, ["trading-volume"], {
  revalidate: 60,
});
export const fetchTradingRevenue = unstable_cache(
  loadRevenue,
  ["trading-revenue"],
  { revalidate: 60 },
);
