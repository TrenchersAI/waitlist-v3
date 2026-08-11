// =============================================================================
// trenchers-router-trades — router (bot_trades) execution analytics
// =============================================================================
//
// Powers the analytics page's "Router trades" section. Reads the trenchers prod
// DB (see `trenchers-db.ts`) — the SAME source as `trenchers-analytics.ts` and
// `trenchers-bots.ts`, and with the SAME correctness guards, because this
// section is customer-facing and must be verifiably real.
//
// Two rules copied verbatim from `trenchers-analytics.ts`, and non-negotiable:
//
//   1. LIVE, CONFIRMED FILLS ONLY. Every query filters `status = 'confirmed'`
//      AND `signature NOT LIKE 'paper%'`. Paper trades carry a synthetic
//      'paper-buy:' / 'paper-sell:' signature; excluding by signature (not by a
//      bot's current `paper_mode` flag) means flipping a bot to paper never
//      rewrites its history. `NOT LIKE 'paper%'` also drops NULL-signature rows,
//      which are not live either.
//
//   2. LAMPORTS → SOL AT THE QUERY EDGE. `sol_amount` (NUMERIC) and the
//      `*_lamports` BIGINT columns are all lamports; we divide by 1e9 in SQL so
//      the UI never touches lamports. This reconciles exactly against on-chain
//      and needs no price feed.
//
// DATA FLOOR: reused from `trenchers-analytics.ts` (2026-07-25 — the day the
// paper/live split + corrected fee recording went live). Earlier data is
// pre-fix and excluded on purpose.

import { getTrenchersPool } from "@/src/lib/trenchers-db";
import { TRADING_FLOOR_ISO } from "@/src/lib/trenchers-analytics";

/** Rolling windows shown in the overview strip. `all` = since the data floor. */
export type RouterWindow = "24h" | "7d" | "all";

/** One overview row per rolling window. All SOL figures already divided by
 *  1e9. `pnlSol` sums `pnl_lamports` across every side; it is only meaningful
 *  on sells (buys carry 0), so the all-sides sum equals the realized PnL. */
export type RouterOverviewRow = {
  window: RouterWindow;
  trades: number;
  buys: number;
  sells: number;
  partials: number;
  volumeSol: number;
  feesSol: number;
  pnlSol: number;
  distinctBots: number;
  distinctUsers: number;
};

export type RouterBuySellDay = {
  date: string; // YYYY-MM-DD
  buys: number;
  sells: number;
  partials: number;
};

/** Landing-rail win rate: which lander (jito / helius / bloxroute / tpu) landed
 *  the fill. NULLs coalesce to 'unknown'. `pct` is share of all rows. */
export type RouterRailRow = { lander: string; trades: number; pct: number };

export type RouterSellReason = { reason: string; trades: number };

export type RouterFeesDay = {
  date: string;
  feesSol: number;
  priorityFeeSol: number;
  jitoTipSol: number;
};

export type RouterPnlDay = { date: string; pnlSol: number };

export type RouterTopBot = {
  botId: string;
  trades: number;
  volumeSol: number;
  pnlSol: number;
};

export type RouterTopUser = {
  userId: string;
  trades: number;
  volumeSol: number;
};

export type RouterVenueRow = {
  venue: string;
  trades: number;
  volumeSol: number;
  pct: number;
};
export type RouterFailureReason = { reason: string; count: number };
export type RouterFailureWindow = {
  window: RouterWindow;
  confirmed: number;
  failed: number;
  ratePct: number;
};
export type RouterFailures = {
  perWindow: RouterFailureWindow[];
  reasons: RouterFailureReason[];
};

export type RouterTradesPayload = {
  overview: RouterOverviewRow[];
  buySellDaily: RouterBuySellDay[];
  railWinRate: RouterRailRow[];
  sellReasons: RouterSellReason[];
  feesRevenueDaily: RouterFeesDay[];
  pnlDaily: RouterPnlDay[];
  topBots: RouterTopBot[];
  topUsers: RouterTopUser[];
  /** null = the `venue` column is not deployed yet (BE migration pending), so
   *  the UI shows a "wiring up" panel rather than a guessed split. Fills recorded
   *  before the column carry NULL and surface as 'unknown'. */
  venueSplit: RouterVenueRow[] | null;
  /** null = the `bot_trade_failures` table is not deployed yet -> "wiring up". */
  failures: RouterFailures | null;
  /** False when TRENCHERS_DATABASE_URL is unset, so the UI can say so plainly
   *  instead of rendering a page of zeros that read as "nothing is trading". */
  available: boolean;
  generatedAt: string;
};

function num(v: unknown): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function int(v: unknown): number {
  return Math.trunc(num(v));
}

const EMPTY: RouterTradesPayload = {
  overview: [],
  buySellDaily: [],
  railWinRate: [],
  sellReasons: [],
  feesRevenueDaily: [],
  pnlDaily: [],
  topBots: [],
  topUsers: [],
  venueSplit: null,
  failures: null,
  available: false,
  generatedAt: new Date().toISOString(),
};

// Non-negotiable per-row guard shared by every query below (see file header).
const LIVE_GUARD = `status = 'confirmed' AND signature NOT LIKE 'paper%'`;

/** The overview aggregate. `windowClause` narrows the base (floor-bounded) set
 *  further for the 24h / 7d rows; empty for the all-time row. */
function overviewSql(windowClause: string): string {
  return `
    SELECT count(*)                                      AS trades,
           count(*) FILTER (WHERE side = 'buy')          AS buys,
           count(*) FILTER (WHERE side = 'sell')         AS sells,
           count(*) FILTER (WHERE side = 'sell_partial') AS partials,
           COALESCE(sum(sol_amount), 0) / 1e9            AS volume_sol,
           COALESCE(sum(fees_lamports), 0) / 1e9         AS fees_sol,
           COALESCE(sum(pnl_lamports), 0) / 1e9          AS pnl_sol,
           count(DISTINCT bot_id)                        AS distinct_bots,
           count(DISTINCT user_id)                       AS distinct_users
      FROM bot_trades
     WHERE ${LIVE_GUARD}
       AND created_at >= $1::date
       ${windowClause}
  `;
}

type OverviewRaw = {
  trades: string;
  buys: string;
  sells: string;
  partials: string;
  volume_sol: string;
  fees_sol: string;
  pnl_sol: string;
  distinct_bots: string;
  distinct_users: string;
};

function mapOverview(window: RouterWindow, r?: OverviewRaw): RouterOverviewRow {
  return {
    window,
    trades: int(r?.trades),
    buys: int(r?.buys),
    sells: int(r?.sells),
    partials: int(r?.partials),
    volumeSol: num(r?.volume_sol),
    feesSol: num(r?.fees_sol),
    pnlSol: num(r?.pnl_sol),
    distinctBots: int(r?.distinct_bots),
    distinctUsers: int(r?.distinct_users),
  };
}

/**
 * One round-trip per concern, assembled in JS — same discipline as
 * `trenchers-bots.ts`. Every query is parametrized on the data floor ($1) and
 * carries the LIVE_GUARD. Nothing here writes; it is all read-only aggregates.
 */
export async function loadRouterTrades(): Promise<RouterTradesPayload> {
  const pool = getTrenchersPool();
  if (!pool) return { ...EMPTY, generatedAt: new Date().toISOString() };

  const floor = TRADING_FLOOR_ISO;

  // --- overview: three rolling windows --------------------------------------
  const overviewAllQ = pool.query<OverviewRaw>(overviewSql(""), [floor]);
  const overview7dQ = pool.query<OverviewRaw>(
    overviewSql(`AND created_at >= now() - interval '7 days'`),
    [floor],
  );
  const overview24hQ = pool.query<OverviewRaw>(
    overviewSql(`AND created_at >= now() - interval '24 hours'`),
    [floor],
  );

  // --- buy / sell / partial counts per day ----------------------------------
  const buySellQ = pool.query<{
    date: string;
    buys: string;
    sells: string;
    partials: string;
  }>(
    `SELECT to_char(date(created_at), 'YYYY-MM-DD')       AS date,
            count(*) FILTER (WHERE side = 'buy')          AS buys,
            count(*) FILTER (WHERE side = 'sell')         AS sells,
            count(*) FILTER (WHERE side = 'sell_partial') AS partials
       FROM bot_trades
      WHERE ${LIVE_GUARD}
        AND created_at >= $1::date
      GROUP BY 1
      ORDER BY 1`,
    [floor],
  );

  // --- landing-rail win rate ------------------------------------------------
  const railQ = pool.query<{ lander: string; trades: string }>(
    `SELECT COALESCE(lander_won, 'unknown') AS lander,
            count(*)                        AS trades
       FROM bot_trades
      WHERE ${LIVE_GUARD}
        AND created_at >= $1::date
      GROUP BY 1
      ORDER BY trades DESC`,
    [floor],
  );

  // --- sell reasons (sells + partial sells only) ----------------------------
  const reasonsQ = pool.query<{ reason: string; trades: string }>(
    `SELECT reason, count(*) AS trades
       FROM bot_trades
      WHERE ${LIVE_GUARD}
        AND side IN ('sell', 'sell_partial')
        AND reason IS NOT NULL
        AND created_at >= $1::date
      GROUP BY 1
      ORDER BY trades DESC`,
    [floor],
  );

  // --- fees / priority fee / jito tip per day (SOL) -------------------------
  const feesQ = pool.query<{
    date: string;
    fees_sol: string;
    priority_fee_sol: string;
    jito_tip_sol: string;
  }>(
    `SELECT to_char(date(created_at), 'YYYY-MM-DD')          AS date,
            COALESCE(sum(fees_lamports), 0) / 1e9            AS fees_sol,
            COALESCE(sum(priority_fee_lamports), 0) / 1e9    AS priority_fee_sol,
            COALESCE(sum(jito_tip_lamports), 0) / 1e9        AS jito_tip_sol
       FROM bot_trades
      WHERE ${LIVE_GUARD}
        AND created_at >= $1::date
      GROUP BY 1
      ORDER BY 1`,
    [floor],
  );

  // --- realized PnL per day (sells only; buys carry no realized PnL) --------
  const pnlQ = pool.query<{ date: string; pnl_sol: string }>(
    `SELECT to_char(date(created_at), 'YYYY-MM-DD')  AS date,
            COALESCE(sum(pnl_lamports), 0) / 1e9     AS pnl_sol
       FROM bot_trades
      WHERE ${LIVE_GUARD}
        AND side <> 'buy'
        AND created_at >= $1::date
      GROUP BY 1
      ORDER BY 1`,
    [floor],
  );

  // --- top 20 bots by volume ------------------------------------------------
  const topBotsQ = pool.query<{
    bot_id: string;
    trades: string;
    volume_sol: string;
    pnl_sol: string;
  }>(
    `SELECT bot_id,
            count(*)                              AS trades,
            COALESCE(sum(sol_amount), 0) / 1e9    AS volume_sol,
            COALESCE(sum(pnl_lamports), 0) / 1e9  AS pnl_sol
       FROM bot_trades
      WHERE ${LIVE_GUARD}
        AND created_at >= $1::date
      GROUP BY bot_id
      ORDER BY volume_sol DESC
      LIMIT 20`,
    [floor],
  );

  // --- top 20 users by volume -----------------------------------------------
  const topUsersQ = pool.query<{
    user_id: string;
    trades: string;
    volume_sol: string;
  }>(
    `SELECT user_id,
            count(*)                           AS trades,
            COALESCE(sum(sol_amount), 0) / 1e9 AS volume_sol
       FROM bot_trades
      WHERE ${LIVE_GUARD}
        AND created_at >= $1::date
      GROUP BY user_id
      ORDER BY volume_sol DESC
      LIMIT 20`,
    [floor],
  );

  const [
    overviewAll,
    overview7d,
    overview24h,
    buySell,
    rail,
    reasons,
    fees,
    pnl,
    topBots,
    topUsers,
  ] = await Promise.all([
    overviewAllQ,
    overview7dQ,
    overview24hQ,
    buySellQ,
    railQ,
    reasonsQ,
    feesQ,
    pnlQ,
    topBotsQ,
    topUsersQ,
  ]);

  const overview: RouterOverviewRow[] = [
    mapOverview("24h", overview24h.rows[0]),
    mapOverview("7d", overview7d.rows[0]),
    mapOverview("all", overviewAll.rows[0]),
  ];

  const buySellDaily: RouterBuySellDay[] = buySell.rows.map((r) => ({
    date: r.date,
    buys: int(r.buys),
    sells: int(r.sells),
    partials: int(r.partials),
  }));

  // pct is computed here (not in SQL) so the divide-by-zero guard is explicit.
  const railTotal = rail.rows.reduce((s, r) => s + int(r.trades), 0);
  const railWinRate: RouterRailRow[] = rail.rows.map((r) => {
    const trades = int(r.trades);
    return {
      lander: r.lander,
      trades,
      pct: railTotal > 0 ? (trades / railTotal) * 100 : 0,
    };
  });

  const sellReasons: RouterSellReason[] = reasons.rows.map((r) => ({
    reason: r.reason,
    trades: int(r.trades),
  }));

  const feesRevenueDaily: RouterFeesDay[] = fees.rows.map((r) => ({
    date: r.date,
    feesSol: num(r.fees_sol),
    priorityFeeSol: num(r.priority_fee_sol),
    jitoTipSol: num(r.jito_tip_sol),
  }));

  const pnlDaily: RouterPnlDay[] = pnl.rows.map((r) => ({
    date: r.date,
    pnlSol: num(r.pnl_sol),
  }));

  const topBotsRows: RouterTopBot[] = topBots.rows.map((r) => ({
    botId: r.bot_id,
    trades: int(r.trades),
    volumeSol: num(r.volume_sol),
    pnlSol: num(r.pnl_sol),
  }));

  const topUsersRows: RouterTopUser[] = topUsers.rows.map((r) => ({
    userId: r.user_id,
    trades: int(r.trades),
    volumeSol: num(r.volume_sol),
  }));

  // --- venue split + failure rate (BE-migration-gated) ----------------------
  // These read `bot_trades.venue` and `bot_trade_failures`, added by a backend
  // migration that may not be deployed yet. A missing column (42703) / table
  // (42P01) is NOT an error here: it means the migration is pending, so the
  // panel stays "wiring up" (null) rather than fabricating a split/rate. Any
  // other error still propagates.
  const migrationPending = (e: unknown): boolean => {
    const code = (e as { code?: string } | null)?.code;
    return code === "42P01" || code === "42703";
  };

  let venueSplit: RouterVenueRow[] | null = null;
  try {
    const vr = await pool.query<{ venue: string; trades: string; vol: string }>(
      `SELECT COALESCE(venue, 'unknown')         AS venue,
              count(*)                           AS trades,
              COALESCE(sum(sol_amount), 0) / 1e9 AS vol
         FROM bot_trades
        WHERE ${LIVE_GUARD} AND created_at >= $1::date
        GROUP BY 1
        ORDER BY trades DESC`,
      [floor],
    );
    const vTotal = vr.rows.reduce((s, r) => s + int(r.trades), 0);
    venueSplit = vr.rows.map((r) => ({
      venue: r.venue,
      trades: int(r.trades),
      volumeSol: num(r.vol),
      pct: vTotal > 0 ? (int(r.trades) / vTotal) * 100 : 0,
    }));
  } catch (e) {
    if (!migrationPending(e)) throw e;
  }

  let failures: RouterFailures | null = null;
  try {
    const [reasonsR, failedR] = await Promise.all([
      pool.query<{ reason: string; count: string }>(
        `SELECT reason, count(*) AS count
           FROM bot_trade_failures
          WHERE paper = false AND created_at >= $1::date
          GROUP BY reason
          ORDER BY count DESC`,
        [floor],
      ),
      pool.query<{ window: string; failed: string }>(
        `SELECT '24h' AS window, count(*) AS failed FROM bot_trade_failures WHERE paper = false AND created_at >= now() - interval '24 hours'
         UNION ALL
         SELECT '7d', count(*) FROM bot_trade_failures WHERE paper = false AND created_at >= now() - interval '7 days'
         UNION ALL
         SELECT 'all', count(*) FROM bot_trade_failures WHERE paper = false AND created_at >= $1::date`,
        [floor],
      ),
    ]);
    const failedByWindow = new Map<string, number>();
    for (const r of failedR.rows) failedByWindow.set(r.window, int(r.failed));
    const perWindow: RouterFailureWindow[] = (
      ["24h", "7d", "all"] as RouterWindow[]
    ).map((w) => {
      const confirmed = overview.find((o) => o.window === w)?.trades ?? 0;
      const failed = failedByWindow.get(w) ?? 0;
      const denom = confirmed + failed;
      return {
        window: w,
        confirmed,
        failed,
        ratePct: denom > 0 ? (failed / denom) * 100 : 0,
      };
    });
    failures = {
      perWindow,
      reasons: reasonsR.rows.map((r) => ({
        reason: r.reason,
        count: int(r.count),
      })),
    };
  } catch (e) {
    if (!migrationPending(e)) throw e;
  }

  return {
    overview,
    venueSplit,
    failures,
    buySellDaily,
    railWinRate,
    sellReasons,
    feesRevenueDaily,
    pnlDaily,
    topBots: topBotsRows,
    topUsers: topUsersRows,
    available: true,
    generatedAt: new Date().toISOString(),
  };
}
