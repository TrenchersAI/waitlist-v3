// =============================================================================
// trenchers-pulse - the founder / marketer view of the whole platform
// =============================================================================
//
// Powers the analytics page's "Live pulse" section. Reads the trenchers prod DB
// (see `trenchers-db.ts`). Deliberately UNCACHED: this is the "where do we
// stand right now" screen, so every load hits the DB.
//
// The three definitions that everything else depends on, and that are easy to
// get wrong:
//
//   LIVE vs PAPER. Paper fills carry a synthetic signature ('paper-buy:' /
//   'paper-sell:'); real on-chain fills carry a base58 signature. Anything
//   TRADE-shaped therefore excludes paper PER-TRADE via
//   `signature NOT LIKE 'paper%'`, never via the bot's current `paper_mode`
//   flag: a bot that flips its flag would otherwise retroactively re-label all
//   of its history. `bots.paper_mode` describes only a bot's CURRENT config.
//   `NOT LIKE 'paper%'` also drops NULL signatures, which are not live either.
//
//   TRADING = a confirmed live fill from EITHER engine. A user who only ever
//   traded by hand is still a trading user, so every "did they trade" question
//   unions `bot_trades` and `trades`. Counting only `bot_trades` understates
//   activity, which is exactly the mistake that makes a dashboard lie.
//
//   A DAY is a UTC day, matching the trading charts. "Today" is the UTC day, so
//   the number resets at 00:00 UTC and never at local midnight.
//
// All lamport columns are converted at the query edge (/1e9) so the UI never
// handles lamports. `trades.input_amount` / `output_amount` are already SOL.
//
// PERFORMANCE. One round-trip per concern, run concurrently, assembled in JS.
// We deliberately avoid a single mega-join: `bot_trades`, `trades` and
// `wallet_deposits` all fan out per user, and joining them multiplies rows and
// silently double-counts every sum.

import { getTrenchersPool } from "@/src/lib/trenchers-db";

/** Matches the trading charts' data floor, for anything rate-shaped. */
export const PULSE_FLOOR_ISO = "2026-07-25";

// -----------------------------------------------------------------------------
// Shapes
// -----------------------------------------------------------------------------

export type FunnelStep = {
  key: string;
  label: string;
  /** How many users have reached this step, all time. */
  users: number;
  /** Percent of the step above it, i.e. the conversion INTO this step. */
  pctOfPrev: number;
  /** Percent of everyone who ever signed up. */
  pctOfTop: number;
  hint: string;
};

export type Growth = {
  totalUsers: number;
  onboardedUsers: number;
  liveTradingEnabled: number;
  newToday: number;
  new7d: number;
  new30d: number;
  /** 7d signups vs the 7d before that, as a percent change. */
  wowPct: number | null;
  /** Last 30 UTC days of signups, oldest first, for a sparkline. */
  signupsByDay: { date: string; count: number }[];
};

export type Engagement = {
  /** Distinct users with a confirmed live fill in the window. */
  dau: number;
  wau: number;
  mau: number;
  /** DAU/MAU. The standard stickiness ratio. */
  stickiness: number | null;
  /** Traded on >= 2 distinct UTC days in the last 30. */
  repeatTraders: number;
  /** Traded in the 7d before last, but not in the last 7d. */
  churned7d: number;
  /** Traded for the first time ever in the last 7d. */
  newTraders7d: number;
};

export type Money = {
  depositedSol: number;
  withdrawnSol: number;
  netDepositedSol: number;
  depositorCount: number;
  /** withdrawn / deposited. Above ~1 means the float is draining. */
  withdrawalRatio: number | null;
  /** Median and p90 NET deposit among users who ever deposited. */
  medianNetSol: number;
  p90NetSol: number;
  /** Custodied SOL we can see right now: Privy wallet balances + bot wallets. */
  walletBalanceSol: number;
  botBalanceSol: number;
  /** Deposits in the last 24h / 7d, to see whether money is still arriving. */
  deposited24hSol: number;
  deposited7dSol: number;
};

export type Revenue = {
  feeSol: number;
  fee7dSol: number;
  fee24hSol: number;
  byKind: { kind: string; sol: number }[];
  /** Fees / trading volume, in bps. The realised take rate. */
  takeRateBps: number | null;
  /** Fees / users who ever traded. */
  arpuSol: number | null;
  volumeSol: number;
};

export type BotHealth = {
  liveBots: number;
  paperBots: number;
  activeLiveBots: number;
  byState: { state: string; live: number; paper: number }[];
  realizedPnlSol: number;
  /** Sell legs only: a leg with pnl_lamports > 0 is a win. */
  winningLegs: number;
  losingLegs: number;
  winRate: number | null;
  /** Bots whose summed realised PnL is > 0 / < 0. */
  profitableBots: number;
  unprofitableBots: number;
  /** Users who ran a paper bot and later spawned a live one. */
  paperToLiveUsers: number;
  paperOnlyUsers: number;
  paperToLivePct: number | null;
  /** Open live positions and the SOL cost basis sitting in them. */
  openPositions: number;
  openCostSol: number;
};

export type ExecutionQuality = {
  /** Last 24h, bot engine. */
  confirmed24h: number;
  failed24h: number;
  confirmRate: number | null;
  /** Which lander won, last 7d. */
  landerMix: { lander: string; count: number }[];
  /** Priority fees + Jito tips actually paid, last 7d (SOL). */
  priorityFee7dSol: number;
  jitoTip7dSol: number;
  /** What we recaptured of the priority fee, last 7d (SOL). */
  priorityCapture7dSol: number;
};

export type Adoption = {
  /** Distinct users touching each surface, all time. */
  items: { key: string; label: string; users: number; pct: number }[];
  pointsUsers: number;
  totalGold: number;
  questAwards: number;
  referredUsers: number;
  referralPct: number | null;
  whitelistEnabled: number;
};

export type PulsePayload = {
  growth: Growth;
  funnel: FunnelStep[];
  engagement: Engagement;
  money: Money;
  revenue: Revenue;
  bots: BotHealth;
  execution: ExecutionQuality;
  adoption: Adoption;
  /** False when TRENCHERS_DATABASE_URL is unset, so the UI can say so plainly
   *  instead of rendering a page of zeros that look like real numbers. */
  available: boolean;
  generatedAt: string;
};

// -----------------------------------------------------------------------------
// Coercion helpers. `pg` hands back NUMERIC/BIGINT as strings.
// -----------------------------------------------------------------------------

function num(v: unknown): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function int(v: unknown): number {
  return Math.trunc(num(v));
}

/** Percent, guarding the divide-by-zero that would render as NaN. */
function pct(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

/** Continuous UTC day axis for the last `days` days, oldest first. */
function recentDays(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  const end = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  for (let i = days - 1; i >= 0; i--) {
    out.push(new Date(end - i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

// -----------------------------------------------------------------------------
// The one SQL fragment worth naming: "this user has traded for real".
//
// Union of both engines, paper excluded per-trade. Used by the funnel, by every
// engagement window, and by ARPU, so it must mean the same thing in all of
// them.
// -----------------------------------------------------------------------------

const LIVE_FILLS_UNION = `
  SELECT user_id, created_at FROM bot_trades
   WHERE status = 'confirmed' AND signature NOT LIKE 'paper%'
  UNION ALL
  SELECT user_id, created_at FROM trades
   WHERE status = 'confirmed' AND signature NOT LIKE 'paper%'
`;

const EMPTY: PulsePayload = {
  growth: {
    totalUsers: 0,
    onboardedUsers: 0,
    liveTradingEnabled: 0,
    newToday: 0,
    new7d: 0,
    new30d: 0,
    wowPct: null,
    signupsByDay: [],
  },
  funnel: [],
  engagement: {
    dau: 0,
    wau: 0,
    mau: 0,
    stickiness: null,
    repeatTraders: 0,
    churned7d: 0,
    newTraders7d: 0,
  },
  money: {
    depositedSol: 0,
    withdrawnSol: 0,
    netDepositedSol: 0,
    depositorCount: 0,
    withdrawalRatio: null,
    medianNetSol: 0,
    p90NetSol: 0,
    walletBalanceSol: 0,
    botBalanceSol: 0,
    deposited24hSol: 0,
    deposited7dSol: 0,
  },
  revenue: {
    feeSol: 0,
    fee7dSol: 0,
    fee24hSol: 0,
    byKind: [],
    takeRateBps: null,
    arpuSol: null,
    volumeSol: 0,
  },
  bots: {
    liveBots: 0,
    paperBots: 0,
    activeLiveBots: 0,
    byState: [],
    realizedPnlSol: 0,
    winningLegs: 0,
    losingLegs: 0,
    winRate: null,
    profitableBots: 0,
    unprofitableBots: 0,
    paperToLiveUsers: 0,
    paperOnlyUsers: 0,
    paperToLivePct: null,
    openPositions: 0,
    openCostSol: 0,
  },
  execution: {
    confirmed24h: 0,
    failed24h: 0,
    confirmRate: null,
    landerMix: [],
    priorityFee7dSol: 0,
    jitoTip7dSol: 0,
    priorityCapture7dSol: 0,
  },
  adoption: {
    items: [],
    pointsUsers: 0,
    totalGold: 0,
    questAwards: 0,
    referredUsers: 0,
    referralPct: null,
    whitelistEnabled: 0,
  },
  available: false,
  generatedAt: new Date().toISOString(),
};

// -----------------------------------------------------------------------------

export async function fetchPlatformPulse(): Promise<PulsePayload> {
  const pool = getTrenchersPool();
  if (!pool) return { ...EMPTY, generatedAt: new Date().toISOString() };

  // --- growth ---------------------------------------------------------------
  const growthQ = pool.query<{
    total: string;
    onboarded: string;
    live_enabled: string;
    new_today: string;
    new_7d: string;
    new_30d: string;
    prev_7d: string;
  }>(`
    SELECT count(*)                                                        AS total,
           count(*) FILTER (WHERE is_onboarded)                            AS onboarded,
           count(*) FILTER (WHERE live_trading_enabled)                    AS live_enabled,
           count(*) FILTER (WHERE created_at >= date_trunc('day', now()))  AS new_today,
           count(*) FILTER (WHERE created_at >= now() - interval '7 days')  AS new_7d,
           count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS new_30d,
           count(*) FILTER (WHERE created_at >= now() - interval '14 days'
                              AND created_at <  now() - interval '7 days')  AS prev_7d
      FROM users
  `);

  const signupDaysQ = pool.query<{ date: string; count: string }>(`
    SELECT to_char(date(created_at), 'YYYY-MM-DD') AS date, count(*) AS count
      FROM users
     WHERE created_at >= now() - interval '30 days'
     GROUP BY 1
  `);

  // --- funnel ---------------------------------------------------------------
  // Each step is a distinct-user count, computed independently. We do NOT
  // assume the steps nest (a user can deposit without onboarding), so the UI
  // shows each as a share of the step above rather than pretending it is a
  // strict subset.
  const funnelQ = pool.query<{
    deposited: string;
    ever_traded: string;
    bot_spawned: string;
    bot_active: string;
  }>(`
    SELECT (SELECT count(DISTINCT user_id) FROM wallet_deposits
             WHERE delta_lamports > 0)                                  AS deposited,
           (SELECT count(DISTINCT user_id) FROM (${LIVE_FILLS_UNION}) f) AS ever_traded,
           (SELECT count(DISTINCT user_id) FROM bots
             WHERE NOT paper_mode)                                      AS bot_spawned,
           (SELECT count(DISTINCT user_id) FROM bots
             WHERE NOT paper_mode AND state = 'active')                 AS bot_active
  `);

  // --- engagement -----------------------------------------------------------
  const engagementQ = pool.query<{
    dau: string;
    wau: string;
    mau: string;
    repeat_traders: string;
    churned: string;
    new_traders: string;
  }>(`
    WITH fills AS (${LIVE_FILLS_UNION})
    SELECT
      (SELECT count(DISTINCT user_id) FROM fills
        WHERE created_at >= date_trunc('day', now()))                    AS dau,
      (SELECT count(DISTINCT user_id) FROM fills
        WHERE created_at >= now() - interval '7 days')                   AS wau,
      (SELECT count(DISTINCT user_id) FROM fills
        WHERE created_at >= now() - interval '30 days')                  AS mau,
      (SELECT count(*) FROM (
          SELECT user_id FROM fills
           WHERE created_at >= now() - interval '30 days'
           GROUP BY user_id
          HAVING count(DISTINCT date(created_at)) >= 2) r)               AS repeat_traders,
      (SELECT count(*) FROM (
          SELECT DISTINCT user_id FROM fills
           WHERE created_at >= now() - interval '14 days'
             AND created_at <  now() - interval '7 days'
          EXCEPT
          SELECT DISTINCT user_id FROM fills
           WHERE created_at >= now() - interval '7 days') c)             AS churned,
      (SELECT count(*) FROM (
          SELECT user_id FROM fills
           GROUP BY user_id
          HAVING min(created_at) >= now() - interval '7 days') n)        AS new_traders
  `);

  // --- money ----------------------------------------------------------------
  // `delta_lamports` is signed: positive = deposit, negative = withdrawal.
  const depositsQ = pool.query<{
    deposited: string;
    withdrawn: string;
    depositors: string;
    dep_24h: string;
    dep_7d: string;
  }>(`
    SELECT COALESCE( sum(delta_lamports) FILTER (WHERE delta_lamports > 0), 0) / 1e9 AS deposited,
           COALESCE(-sum(delta_lamports) FILTER (WHERE delta_lamports < 0), 0) / 1e9 AS withdrawn,
           count(DISTINCT user_id) FILTER (WHERE delta_lamports > 0)                 AS depositors,
           COALESCE(sum(delta_lamports) FILTER (
             WHERE delta_lamports > 0
               AND COALESCE(block_time, created_at) >= now() - interval '24 hours'
           ), 0) / 1e9                                                               AS dep_24h,
           COALESCE(sum(delta_lamports) FILTER (
             WHERE delta_lamports > 0
               AND COALESCE(block_time, created_at) >= now() - interval '7 days'
           ), 0) / 1e9                                                               AS dep_7d
      FROM wallet_deposits
  `);

  // Median / p90 of NET deposit per depositor. Percentiles must run over the
  // per-user aggregate, not the raw transfer rows, or they describe transfer
  // sizes instead of customers.
  const depositDistQ = pool.query<{ median: string; p90: string }>(`
    WITH per_user AS (
      SELECT user_id, sum(delta_lamports) / 1e9 AS net
        FROM wallet_deposits
       GROUP BY user_id
      HAVING sum(delta_lamports) FILTER (WHERE delta_lamports > 0) > 0
    )
    SELECT COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY net), 0) AS median,
           COALESCE(percentile_cont(0.9) WITHIN GROUP (ORDER BY net), 0) AS p90
      FROM per_user
  `);

  // Custodied SOL we can actually see. `wallet_balances` is keyed by wallet, so
  // it is summed directly rather than per user.
  const balancesQ = pool.query<{ wallet_sol: string }>(`
    SELECT COALESCE(sum(sol_lamports), 0) / 1e9 AS wallet_sol FROM wallet_balances
  `);

  // --- revenue --------------------------------------------------------------
  const revenueQ = pool.query<{
    kind: string;
    sol: string;
    sol_7d: string;
    sol_24h: string;
  }>(`
    SELECT kind,
           sum(fee_lamports) / 1e9 AS sol,
           COALESCE(sum(fee_lamports) FILTER (
             WHERE created_at >= now() - interval '7 days'), 0) / 1e9  AS sol_7d,
           COALESCE(sum(fee_lamports) FILTER (
             WHERE created_at >= now() - interval '24 hours'), 0) / 1e9 AS sol_24h
      FROM fee_ledger
     WHERE fee_token = 'SOL'
       AND signature NOT LIKE 'paper%'
     GROUP BY kind
  `);

  // Volume across BOTH engines, for the take-rate denominator. Mirrors
  // `trenchers-analytics.ts`: bot size is lamports, the manual SOL leg is the
  // input on a buy and the output on a sell.
  const volumeQ = pool.query<{ bot_sol: string; manual_sol: string }>(`
    SELECT (SELECT COALESCE(sum(sol_amount), 0) / 1e9 FROM bot_trades
             WHERE status = 'confirmed'
               AND signature NOT LIKE 'paper%')                        AS bot_sol,
           (SELECT COALESCE(sum(CASE WHEN side = 'buy' THEN input_amount
                                     ELSE output_amount END), 0) FROM trades
             WHERE status = 'confirmed'
               AND signature NOT LIKE 'paper%'
               AND quote_mint LIKE 'So111%')                           AS manual_sol
  `);

  // --- bots -----------------------------------------------------------------
  const botStateQ = pool.query<{ state: string; live: string; paper: string }>(`
    SELECT state,
           count(*) FILTER (WHERE NOT paper_mode) AS live,
           count(*) FILTER (WHERE paper_mode)     AS paper
      FROM bots
     GROUP BY state
  `);

  // Win rate is a SELL-leg question: buys have no realised PnL, and counting
  // them as "not a win" would halve the rate for arithmetic reasons alone.
  const botPnlQ = pool.query<{
    realized: string;
    wins: string;
    losses: string;
  }>(`
    SELECT COALESCE(sum(pnl_lamports), 0) / 1e9              AS realized,
           count(*) FILTER (WHERE pnl_lamports > 0)          AS wins,
           count(*) FILTER (WHERE pnl_lamports < 0)          AS losses
      FROM bot_trades
     WHERE status = 'confirmed'
       AND signature NOT LIKE 'paper%'
       AND pnl_lamports IS NOT NULL
  `);

  const botProfitQ = pool.query<{ profitable: string; unprofitable: string }>(`
    WITH per_bot AS (
      SELECT bot_id, sum(pnl_lamports) AS pnl
        FROM bot_trades
       WHERE status = 'confirmed'
         AND signature NOT LIKE 'paper%'
         AND pnl_lamports IS NOT NULL
       GROUP BY bot_id
    )
    SELECT count(*) FILTER (WHERE pnl > 0) AS profitable,
           count(*) FILTER (WHERE pnl < 0) AS unprofitable
      FROM per_bot
  `);

  // Paper to live conversion: of the users who ever ran a paper bot, how many
  // now have a live one. This is the product's core funnel question.
  const paperConvQ = pool.query<{ converted: string; paper_only: string }>(`
    WITH per_user AS (
      SELECT user_id,
             bool_or(paper_mode)     AS had_paper,
             bool_or(NOT paper_mode) AS had_live
        FROM bots
       GROUP BY user_id
    )
    SELECT count(*) FILTER (WHERE had_paper AND had_live)     AS converted,
           count(*) FILTER (WHERE had_paper AND NOT had_live) AS paper_only
      FROM per_user
  `);

  // Open exposure. Joined to `bots` to keep paper bots' positions out of a
  // number that reads as real money at risk.
  const positionsQ = pool.query<{ n: string; cost: string }>(`
    SELECT count(*) AS n, COALESCE(sum(p.sol_cost), 0) / 1e9 AS cost
      FROM bot_positions p
      JOIN bots b ON b.id = p.bot_id
     WHERE NOT b.paper_mode
  `);

  const botBalanceQ = pool.query<{ sol: string }>(`
    SELECT COALESCE(sum(observed_balance_lamports), 0) / 1e9 AS sol
      FROM bots WHERE NOT paper_mode
  `);

  // --- execution quality ----------------------------------------------------
  const execQ = pool.query<{ confirmed: string; failed: string }>(`
    SELECT count(*) FILTER (WHERE status = 'confirmed') AS confirmed,
           count(*) FILTER (WHERE status = 'failed')    AS failed
      FROM bot_trades
     WHERE signature NOT LIKE 'paper%'
       AND created_at >= now() - interval '24 hours'
  `);

  const landerQ = pool.query<{ lander: string | null; count: string }>(`
    SELECT lander_won AS lander, count(*) AS count
      FROM bot_trades
     WHERE status = 'confirmed'
       AND signature NOT LIKE 'paper%'
       AND lander_won IS NOT NULL
       AND created_at >= now() - interval '7 days'
     GROUP BY 1
     ORDER BY 2 DESC
  `);

  const feesPaidQ = pool.query<{
    prio: string;
    tip: string;
    capture: string;
  }>(`
    SELECT COALESCE(sum(priority_fee_lamports), 0) / 1e9              AS prio,
           COALESCE(sum(jito_tip_lamports), 0) / 1e9                  AS tip,
           COALESCE(sum(platform_priority_capture_lamports), 0) / 1e9 AS capture
      FROM bot_trades
     WHERE status = 'confirmed'
       AND signature NOT LIKE 'paper%'
       AND created_at >= now() - interval '7 days'
  `);

  // --- adoption -------------------------------------------------------------
  // Distinct users per surface. Each is its own scalar subquery so that a
  // surface nobody uses returns 0 instead of dropping out of a join.
  const adoptionQ = pool.query<{
    orders: string;
    sniper: string;
    copytrade: string;
    trackers: string;
    watchlist: string;
    manual: string;
    points_users: string;
    total_gold: string;
    quest_awards: string;
    referred: string;
    whitelist: string;
  }>(`
    SELECT (SELECT count(DISTINCT user_id) FROM orders)                        AS orders,
           (SELECT count(*) FROM sniper_configs WHERE enabled)                 AS sniper,
           (SELECT count(DISTINCT user_id) FROM copy_targets WHERE enabled)    AS copytrade,
           (SELECT count(DISTINCT user_id) FROM tracked_wallets WHERE enabled) AS trackers,
           (SELECT count(DISTINCT user_id) FROM watchlist)                     AS watchlist,
           (SELECT count(DISTINCT user_id) FROM trades
             WHERE status = 'confirmed' AND signature NOT LIKE 'paper%')       AS manual,
           (SELECT count(*) FROM user_points WHERE gold > 0)                   AS points_users,
           (SELECT COALESCE(sum(gold), 0) FROM user_points)                    AS total_gold,
           (SELECT count(*) FROM user_quest_awards)                            AS quest_awards,
           (SELECT count(*) FROM referrals WHERE referred_by IS NOT NULL)      AS referred,
           (SELECT count(*) FROM login_whitelist WHERE enabled)                AS whitelist
  `);

  const [
    growthR,
    signupDaysR,
    funnelR,
    engagementR,
    depositsR,
    depositDistR,
    balancesR,
    revenueR,
    volumeR,
    botStateR,
    botPnlR,
    botProfitR,
    paperConvR,
    positionsR,
    botBalanceR,
    execR,
    landerR,
    feesPaidR,
    adoptionR,
  ] = await Promise.all([
    growthQ,
    signupDaysQ,
    funnelQ,
    engagementQ,
    depositsQ,
    depositDistQ,
    balancesQ,
    revenueQ,
    volumeQ,
    botStateQ,
    botPnlQ,
    botProfitQ,
    paperConvQ,
    positionsQ,
    botBalanceQ,
    execQ,
    landerQ,
    feesPaidQ,
    adoptionQ,
  ]);

  // --- assemble: growth -----------------------------------------------------
  const g = growthR.rows[0];
  const totalUsers = int(g?.total);
  const new7d = int(g?.new_7d);
  const prev7d = int(g?.prev_7d);

  const signupMap = new Map(
    signupDaysR.rows.map((r) => [r.date, int(r.count)]),
  );
  const growth: Growth = {
    totalUsers,
    onboardedUsers: int(g?.onboarded),
    liveTradingEnabled: int(g?.live_enabled),
    newToday: int(g?.new_today),
    new7d,
    new30d: int(g?.new_30d),
    // No prior week means no comparison to make. Reporting +100% off a zero
    // base would be a fabricated growth number.
    wowPct: prev7d > 0 ? ((new7d - prev7d) / prev7d) * 100 : null,
    signupsByDay: recentDays(30).map((date) => ({
      date,
      count: signupMap.get(date) ?? 0,
    })),
  };

  // --- assemble: funnel -----------------------------------------------------
  const f = funnelR.rows[0];
  const rawFunnel = [
    {
      key: "signed_up",
      label: "Signed up",
      users: totalUsers,
      hint: "Every row in users",
    },
    {
      key: "onboarded",
      label: "Onboarded",
      users: int(g?.onboarded),
      hint: "Finished onboarding",
    },
    {
      key: "deposited",
      label: "Deposited",
      users: int(f?.deposited),
      hint: "At least one SOL deposit",
    },
    {
      key: "traded",
      label: "Traded live",
      users: int(f?.ever_traded),
      hint: "A confirmed on-chain fill, bot or manual",
    },
    {
      key: "bot",
      label: "Spawned a live bot",
      users: int(f?.bot_spawned),
      hint: "At least one non-paper bot",
    },
    {
      key: "bot_active",
      label: "Bot active now",
      users: int(f?.bot_active),
      hint: "A live bot in state 'active'",
    },
  ];
  const funnel: FunnelStep[] = rawFunnel.map((step, i) => ({
    ...step,
    pctOfPrev: i === 0 ? 100 : pct(step.users, rawFunnel[i - 1].users),
    pctOfTop: pct(step.users, totalUsers),
  }));

  // --- assemble: engagement -------------------------------------------------
  const e = engagementR.rows[0];
  const mau = int(e?.mau);
  const engagement: Engagement = {
    dau: int(e?.dau),
    wau: int(e?.wau),
    mau,
    stickiness: ratio(int(e?.dau), mau),
    repeatTraders: int(e?.repeat_traders),
    churned7d: int(e?.churned),
    newTraders7d: int(e?.new_traders),
  };

  // --- assemble: money ------------------------------------------------------
  const d = depositsR.rows[0];
  const deposited = num(d?.deposited);
  const withdrawn = num(d?.withdrawn);
  const money: Money = {
    depositedSol: deposited,
    withdrawnSol: withdrawn,
    netDepositedSol: deposited - withdrawn,
    depositorCount: int(d?.depositors),
    withdrawalRatio: ratio(withdrawn, deposited),
    medianNetSol: num(depositDistR.rows[0]?.median),
    p90NetSol: num(depositDistR.rows[0]?.p90),
    walletBalanceSol: num(balancesR.rows[0]?.wallet_sol),
    botBalanceSol: num(botBalanceR.rows[0]?.sol),
    deposited24hSol: num(d?.dep_24h),
    deposited7dSol: num(d?.dep_7d),
  };

  // --- assemble: revenue ----------------------------------------------------
  const byKind = revenueR.rows.map((r) => ({
    kind: r.kind,
    sol: num(r.sol),
  }));
  const feeSol = byKind.reduce((s, r) => s + r.sol, 0);
  const volumeSol =
    num(volumeR.rows[0]?.bot_sol) + num(volumeR.rows[0]?.manual_sol);
  const everTraded = int(f?.ever_traded);
  const revenue: Revenue = {
    feeSol,
    fee7dSol: revenueR.rows.reduce((s, r) => s + num(r.sol_7d), 0),
    fee24hSol: revenueR.rows.reduce((s, r) => s + num(r.sol_24h), 0),
    byKind: byKind.sort((a, b) => b.sol - a.sol),
    takeRateBps: volumeSol > 0 ? (feeSol / volumeSol) * 10_000 : null,
    arpuSol: ratio(feeSol, everTraded),
    volumeSol,
  };

  // --- assemble: bots -------------------------------------------------------
  const byState = botStateR.rows.map((r) => ({
    state: r.state,
    live: int(r.live),
    paper: int(r.paper),
  }));
  const wins = int(botPnlR.rows[0]?.wins);
  const losses = int(botPnlR.rows[0]?.losses);
  const converted = int(paperConvR.rows[0]?.converted);
  const paperOnly = int(paperConvR.rows[0]?.paper_only);
  const bots: BotHealth = {
    liveBots: byState.reduce((s, r) => s + r.live, 0),
    paperBots: byState.reduce((s, r) => s + r.paper, 0),
    activeLiveBots: byState.find((r) => r.state === "active")?.live ?? 0,
    byState: byState.sort((a, b) => b.live + b.paper - (a.live + a.paper)),
    realizedPnlSol: num(botPnlR.rows[0]?.realized),
    winningLegs: wins,
    losingLegs: losses,
    winRate: ratio(wins, wins + losses),
    profitableBots: int(botProfitR.rows[0]?.profitable),
    unprofitableBots: int(botProfitR.rows[0]?.unprofitable),
    paperToLiveUsers: converted,
    paperOnlyUsers: paperOnly,
    paperToLivePct:
      converted + paperOnly > 0 ? pct(converted, converted + paperOnly) : null,
    openPositions: int(positionsR.rows[0]?.n),
    openCostSol: num(positionsR.rows[0]?.cost),
  };

  // --- assemble: execution --------------------------------------------------
  const confirmed24h = int(execR.rows[0]?.confirmed);
  const failed24h = int(execR.rows[0]?.failed);
  const execution: ExecutionQuality = {
    confirmed24h,
    failed24h,
    confirmRate: ratio(confirmed24h, confirmed24h + failed24h),
    landerMix: landerR.rows.map((r) => ({
      lander: r.lander ?? "unknown",
      count: int(r.count),
    })),
    priorityFee7dSol: num(feesPaidR.rows[0]?.prio),
    jitoTip7dSol: num(feesPaidR.rows[0]?.tip),
    priorityCapture7dSol: num(feesPaidR.rows[0]?.capture),
  };

  // --- assemble: adoption ---------------------------------------------------
  const a = adoptionR.rows[0];
  const adoptionItems = [
    { key: "manual", label: "Manual trading", users: int(a?.manual) },
    { key: "bots", label: "Live bots", users: int(f?.bot_spawned) },
    { key: "orders", label: "Limit orders", users: int(a?.orders) },
    { key: "sniper", label: "Sniper", users: int(a?.sniper) },
    { key: "copytrade", label: "Copy trading", users: int(a?.copytrade) },
    { key: "trackers", label: "Wallet trackers", users: int(a?.trackers) },
    { key: "watchlist", label: "Watchlist", users: int(a?.watchlist) },
  ];
  const referred = int(a?.referred);
  const adoption: Adoption = {
    items: adoptionItems
      .map((it) => ({ ...it, pct: pct(it.users, totalUsers) }))
      .sort((x, y) => y.users - x.users),
    pointsUsers: int(a?.points_users),
    totalGold: num(a?.total_gold),
    questAwards: int(a?.quest_awards),
    referredUsers: referred,
    referralPct: totalUsers > 0 ? pct(referred, totalUsers) : null,
    whitelistEnabled: int(a?.whitelist),
  };

  return {
    growth,
    funnel,
    engagement,
    money,
    revenue,
    bots,
    execution,
    adoption,
    available: true,
    generatedAt: new Date().toISOString(),
  };
}
