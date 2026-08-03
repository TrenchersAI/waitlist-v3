// =============================================================================
// trenchers-bots — live bot adoption, deposits, and per-user PnL
// =============================================================================
//
// Powers the analytics page's "Bots" section. Reads the trenchers prod DB (see
// `trenchers-db.ts`). Deliberately UNCACHED: this section answers "who is live
// right now", so every load hits the DB.
//
// Two definitions that matter and are easy to get wrong:
//
//   LIVE vs PAPER. A bot is paper if `bots.paper_mode` is true. But a bot's
//   flag can be flipped after the fact, which would retroactively re-label its
//   history. So for anything TRADE-shaped we exclude paper per-trade by the
//   synthetic signature ('paper-buy:' / 'paper-sell:'), exactly as
//   `trenchers-analytics.ts` does. `bots.paper_mode` is only used to describe
//   the bot's CURRENT configuration, never to attribute historical trades.
//
//   SPAWNED vs TRADING. "Spawned" = the user has at least one non-paper bot
//   row. "Trading" = that user has at least one confirmed, non-paper fill.
//   The gap between the two is the interesting number: people who set a bot up
//   and never got a live trade out of it.
//
// All SOL amounts are converted from lamports at the query edge (/1e9) so the
// UI never handles lamports.

import { getTrenchersPool } from "@/src/lib/trenchers-db";

/** Bot lifecycle states, per the `bots.state` CHECK constraint. */
export type BotState =
  | "draft"
  | "funded"
  | "active"
  | "paused"
  | "drained"
  | "archived";

export type BotsSummary = {
  /** Users with >=1 non-paper bot row. */
  usersWithLiveBots: number;
  /** Users with >=1 bot of any kind (incl. paper-only). */
  usersWithAnyBot: number;
  /** Users with >=1 non-paper bot in state 'active' right now. */
  usersWithActiveLiveBots: number;
  /** Spawned a live bot but has never had a confirmed non-paper fill. */
  usersSpawnedNotTrading: number;
  /** Had a confirmed non-paper fill in the last 24h. */
  usersTradingLast24h: number;

  liveBots: number;
  paperBots: number;
  activeLiveBots: number;

  /** Gross SOL in / out across all tracked Privy wallets, and the net. */
  depositedSol: number;
  withdrawnSol: number;
  netDepositedSol: number;
  /** Distinct users who have ever deposited. */
  depositorCount: number;

  /** Realized PnL across all live bot fills (SOL). */
  realizedPnlSol: number;
  /** Live bot volume, all time (SOL). */
  volumeSol: number;
  liveFills: number;
};

export type BotsByState = { state: BotState; live: number; paper: number };

export type BotUserRow = {
  userId: string;
  email: string | null;
  name: string | null;
  walletAddress: string | null;
  joinedAt: string | null;

  botsLive: number;
  botsPaper: number;
  botsActive: number;
  /** Sum of `observed_balance_lamports` across the user's live bots (SOL). */
  botBalanceSol: number;

  depositedSol: number;
  withdrawnSol: number;
  netDepositedSol: number;

  liveFills: number;
  volumeSol: number;
  realizedPnlSol: number;
  lastTradeAt: string | null;
  lastActiveAt: string | null;
  /** Spawned a live bot but never produced a confirmed non-paper fill. */
  spawnedNotTrading: boolean;
};

export type BotsPayload = {
  summary: BotsSummary;
  byState: BotsByState[];
  users: BotUserRow[];
  /** Null when TRENCHERS_DATABASE_URL is unset, so the UI can say so plainly
   *  instead of rendering a page of zeros that look like real numbers. */
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

function iso(v: unknown): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const EMPTY: BotsPayload = {
  summary: {
    usersWithLiveBots: 0,
    usersWithAnyBot: 0,
    usersWithActiveLiveBots: 0,
    usersSpawnedNotTrading: 0,
    usersTradingLast24h: 0,
    liveBots: 0,
    paperBots: 0,
    activeLiveBots: 0,
    depositedSol: 0,
    withdrawnSol: 0,
    netDepositedSol: 0,
    depositorCount: 0,
    realizedPnlSol: 0,
    volumeSol: 0,
    liveFills: 0,
  },
  byState: [],
  users: [],
  available: false,
  generatedAt: new Date().toISOString(),
};

/**
 * One round-trip per concern, assembled in JS. We deliberately do NOT write a
 * single mega-join: `bot_trades` and `wallet_deposits` both fan out per user,
 * and joining them together multiplies rows and silently double-counts the
 * deposit sums. Aggregate each independently, then stitch on user_id.
 */
export async function fetchBotsAnalytics(): Promise<BotsPayload> {
  const pool = getTrenchersPool();
  if (!pool) return { ...EMPTY, generatedAt: new Date().toISOString() };

  // --- bots, per user, split live vs paper -----------------------------------
  const botsQ = pool.query<{
    user_id: string;
    bots_live: string;
    bots_paper: string;
    bots_active: string;
    bot_balance_sol: string;
    last_active_at: Date | null;
  }>(`
    SELECT user_id,
           count(*) FILTER (WHERE NOT paper_mode)                          AS bots_live,
           count(*) FILTER (WHERE paper_mode)                              AS bots_paper,
           count(*) FILTER (WHERE NOT paper_mode AND state = 'active')     AS bots_active,
           COALESCE(sum(observed_balance_lamports)
                    FILTER (WHERE NOT paper_mode), 0) / 1e9                AS bot_balance_sol,
           max(last_active_at)                                             AS last_active_at
      FROM bots
     GROUP BY user_id
  `);

  // --- bot counts by lifecycle state ----------------------------------------
  const stateQ = pool.query<{ state: string; live: string; paper: string }>(`
    SELECT state,
           count(*) FILTER (WHERE NOT paper_mode) AS live,
           count(*) FILTER (WHERE paper_mode)     AS paper
      FROM bots
     GROUP BY state
  `);

  // --- deposits / withdrawals, per user -------------------------------------
  // `delta_lamports` is signed: positive = deposit, negative = withdrawal.
  const depQ = pool.query<{
    user_id: string;
    deposited_sol: string;
    withdrawn_sol: string;
  }>(`
    SELECT user_id,
           COALESCE(sum(delta_lamports) FILTER (WHERE delta_lamports > 0), 0) / 1e9 AS deposited_sol,
           COALESCE(-sum(delta_lamports) FILTER (WHERE delta_lamports < 0), 0) / 1e9 AS withdrawn_sol
      FROM wallet_deposits
     GROUP BY user_id
  `);

  // --- live fills, volume, realized PnL, per user ----------------------------
  // Paper excluded PER-TRADE by synthetic signature, never by the bot's current
  // flag. `NOT LIKE 'paper%'` also drops NULL signatures, which are not live.
  const tradeQ = pool.query<{
    user_id: string;
    live_fills: string;
    volume_sol: string;
    realized_pnl_sol: string;
    last_trade_at: Date | null;
  }>(`
    SELECT user_id,
           count(*)                                   AS live_fills,
           COALESCE(sum(sol_amount), 0) / 1e9         AS volume_sol,
           COALESCE(sum(pnl_lamports), 0) / 1e9       AS realized_pnl_sol,
           max(created_at)                            AS last_trade_at
      FROM bot_trades
     WHERE status = 'confirmed'
       AND signature NOT LIKE 'paper%'
     GROUP BY user_id
  `);

  // --- users who traded live in the last 24h --------------------------------
  const recentQ = pool.query<{ n: string }>(`
    SELECT count(DISTINCT user_id) AS n
      FROM bot_trades
     WHERE status = 'confirmed'
       AND signature NOT LIKE 'paper%'
       AND created_at >= now() - interval '24 hours'
  `);

  // --- identity -------------------------------------------------------------
  const usersQ = pool.query<{
    id: string;
    email: string | null;
    display_name: string | null;
    username: string | null;
    wallet_address: string | null;
    created_at: Date | null;
  }>(`
    SELECT id, email, display_name, username, wallet_address, created_at
      FROM users
  `);

  const [bots, states, deps, trades, recent, users] = await Promise.all([
    botsQ,
    stateQ,
    depQ,
    tradeQ,
    recentQ,
    usersQ,
  ]);

  const identity = new Map(users.rows.map((u) => [u.id, u]));
  const depByUser = new Map(deps.rows.map((d) => [d.user_id, d]));
  const tradeByUser = new Map(trades.rows.map((t) => [t.user_id, t]));

  // Every user who has a bot OR a deposit OR a live fill belongs in the table.
  const userIds = new Set<string>([
    ...bots.rows.map((b) => b.user_id),
    ...deps.rows.map((d) => d.user_id),
    ...trades.rows.map((t) => t.user_id),
  ]);

  const botByUser = new Map(bots.rows.map((b) => [b.user_id, b]));

  const rows: BotUserRow[] = [];
  for (const userId of userIds) {
    const b = botByUser.get(userId);
    const d = depByUser.get(userId);
    const t = tradeByUser.get(userId);
    const u = identity.get(userId);

    const botsLive = int(b?.bots_live);
    const liveFills = int(t?.live_fills);
    const deposited = num(d?.deposited_sol);
    const withdrawn = num(d?.withdrawn_sol);

    rows.push({
      userId,
      email: u?.email ?? null,
      name: u?.display_name ?? u?.username ?? null,
      walletAddress: u?.wallet_address ?? null,
      joinedAt: iso(u?.created_at),

      botsLive,
      botsPaper: int(b?.bots_paper),
      botsActive: int(b?.bots_active),
      botBalanceSol: num(b?.bot_balance_sol),

      depositedSol: deposited,
      withdrawnSol: withdrawn,
      netDepositedSol: deposited - withdrawn,

      liveFills,
      volumeSol: num(t?.volume_sol),
      realizedPnlSol: num(t?.realized_pnl_sol),
      lastTradeAt: iso(t?.last_trade_at),
      lastActiveAt: iso(b?.last_active_at),

      spawnedNotTrading: botsLive > 0 && liveFills === 0,
    });
  }

  // Biggest net depositors first — that is the ordering you actually want when
  // scanning for who matters.
  rows.sort((a, b) => b.netDepositedSol - a.netDepositedSol);

  const summary: BotsSummary = {
    usersWithLiveBots: rows.filter((r) => r.botsLive > 0).length,
    usersWithAnyBot: rows.filter((r) => r.botsLive + r.botsPaper > 0).length,
    usersWithActiveLiveBots: rows.filter((r) => r.botsActive > 0).length,
    usersSpawnedNotTrading: rows.filter((r) => r.spawnedNotTrading).length,
    usersTradingLast24h: int(recent.rows[0]?.n),

    liveBots: states.rows.reduce((s, r) => s + int(r.live), 0),
    paperBots: states.rows.reduce((s, r) => s + int(r.paper), 0),
    activeLiveBots: int(
      states.rows.find((r) => r.state === "active")?.live ?? 0,
    ),

    depositedSol: rows.reduce((s, r) => s + r.depositedSol, 0),
    withdrawnSol: rows.reduce((s, r) => s + r.withdrawnSol, 0),
    netDepositedSol: rows.reduce((s, r) => s + r.netDepositedSol, 0),
    depositorCount: rows.filter((r) => r.depositedSol > 0).length,

    realizedPnlSol: rows.reduce((s, r) => s + r.realizedPnlSol, 0),
    volumeSol: rows.reduce((s, r) => s + r.volumeSol, 0),
    liveFills: rows.reduce((s, r) => s + r.liveFills, 0),
  };

  const byState: BotsByState[] = states.rows.map((r) => ({
    state: r.state as BotState,
    live: int(r.live),
    paper: int(r.paper),
  }));

  return {
    summary,
    byState,
    users: rows,
    available: true,
    generatedAt: new Date().toISOString(),
  };
}
