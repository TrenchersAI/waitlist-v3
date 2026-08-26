// =============================================================================
// trenchers-bot-detail - drill-down: one user's bots, and one bot's full story
// =============================================================================
//
// Powers the Bots tab's two drill-down levels:
//   user row  -> every bot that user has spawned
//   bot row   -> that bot's config, balances, open positions and every trade
//
// THE BALANCE NUMBER. `free_lamports` is not invented here. It is the exact
// expression the terminal shows the user, lifted from `FREE_BALANCE_BY_ID_SQL`
// in st-db/src/repo_bots.rs:
//
//   GREATEST(0, allocated
//               + SUM(COALESCE(pnl_lamports,0) - fees_lamports)
//               - deployed_sol            (open-position cost basis)
//               - SUM(cost_lamports))     (reverted swaps that still paid gas)
//
// Any other formula would show the operator a different number than the
// customer is looking at, which is worse than showing nothing. `COALESCE` on
// `pnl_lamports` is load-bearing: buy rows have NULL PnL but a real fee, and
// SUM(pnl - fees) is NULL on those rows, silently dropping every buy-side fee.
//
// PAPER vs LIVE. A bot is one or the other for its whole life, so a bot's own
// aggregates are computed over ALL its confirmed trades and mean "what this bot
// did". `paperFills` is returned alongside so contamination is visible rather
// than silently folded into a number that reads as real money.
//
// All lamport columns are converted at the query edge (/1e9). `sol_amount`,
// `sol_cost` and every `*_lamports` column are WHOLE LAMPORTS despite the
// `sol_*` naming (verified against st-api and repo_bots.rs).

import { getTrenchersPool } from "@/src/lib/trenchers-db";

/** Cap on trades returned for one bot. The busiest bot in prod is far below
 *  this; the limit exists so a runaway bot cannot blow up the payload. */
export const TRADE_LIMIT = 1000;

/** The free-balance expression, verbatim from repo_bots.rs. `b` must be the
 *  `bots` alias in the surrounding query. */
const FREE_BALANCE_SQL = `
  GREATEST(
    0,
    b.allocated_lamports
    + COALESCE((SELECT SUM(COALESCE(pnl_lamports, 0) - fees_lamports)
                  FROM bot_trades WHERE bot_id = b.id), 0)
    - COALESCE((SELECT deployed_sol FROM bot_deployed_sol WHERE bot_id = b.id), 0)
    - COALESCE((SELECT SUM(cost_lamports)
                  FROM bot_tx_attempts WHERE bot_id = b.id), 0)
  )::bigint`;

export type BotSummaryRow = {
  botId: string;
  name: string;
  state: string;
  paperMode: boolean;
  walletPubkey: string;
  signerKind: string;
  region: string;
  expertMode: boolean;
  configVersion: number;
  createdAt: string | null;
  lastActiveAt: string | null;

  /** What the user is shown as spendable. See FREE_BALANCE_SQL. */
  freeSol: number;
  allocatedSol: number;
  /** Last on-chain balance the engine observed for the bot wallet. */
  observedSol: number;
  capSol: number;
  drawdownStopSol: number;
  spendLimitSol: number;

  fills: number;
  paperFills: number;
  failedFills: number;
  volumeSol: number;
  realizedPnlSol: number;
  feesPaidSol: number;
  openPositions: number;
  openCostSol: number;
  lastTradeAt: string | null;
};

export type BotTradeRow = {
  id: string;
  side: string;
  mint: string;
  tierIndex: number | null;
  solAmount: number;
  tokenAmount: string;
  status: string;
  signature: string | null;
  pnlSol: number | null;
  feesSol: number;
  priorityFeeSol: number;
  jitoTipSol: number;
  landerWon: string | null;
  slot: string | null;
  reason: string | null;
  createdAt: string | null;
};

export type BotPositionRow = {
  mint: string;
  tokenAmount: string;
  solCost: number;
  entryBcPct: number | null;
  peakMult: number;
  nextTier: number;
  openedAt: string | null;
};

export type UserBotsPayload = {
  user: {
    userId: string;
    email: string | null;
    name: string | null;
    walletAddress: string | null;
    joinedAt: string | null;
    isOnboarded: boolean;
    liveTradingEnabled: boolean;
  } | null;
  bots: BotSummaryRow[];
  available: boolean;
  generatedAt: string;
};

export type BotDetailPayload = {
  bot: (BotSummaryRow & {
    userId: string;
    userEmail: string | null;
    /** The BotConfig JSON exactly as stored, so the operator sees the same
     *  settings the customer configured. */
    config: unknown;
  }) | null;
  positions: BotPositionRow[];
  trades: BotTradeRow[];
  /** Total trade rows for this bot; `trades` is capped at TRADE_LIMIT. */
  tradeCount: number;
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

/** Per-bot trade aggregates, keyed by bot id. Kept as its own round trip:
 *  joining it into the bots query fans out per trade and multiplies the
 *  balance columns. */
const AGG_SQL = `
  SELECT bot_id,
         count(*) FILTER (WHERE status = 'confirmed'
                            AND signature NOT LIKE 'paper%')          AS fills,
         count(*) FILTER (WHERE status = 'confirmed'
                            AND signature LIKE 'paper%')              AS paper_fills,
         count(*) FILTER (WHERE status = 'failed')                    AS failed_fills,
         COALESCE(sum(sol_amount) FILTER (WHERE status = 'confirmed'), 0) / 1e9 AS volume_sol,
         COALESCE(sum(pnl_lamports) FILTER (WHERE status = 'confirmed'), 0) / 1e9 AS realized_pnl_sol,
         COALESCE(sum(fees_lamports) FILTER (WHERE status = 'confirmed'), 0) / 1e9 AS fees_paid_sol,
         max(created_at)                                              AS last_trade_at
    FROM bot_trades
   GROUP BY bot_id`;

const POS_SQL = `
  SELECT bot_id, count(*) AS n, COALESCE(sum(sol_cost), 0) / 1e9 AS cost_sol
    FROM bot_positions GROUP BY bot_id`;

const BOT_COLUMNS = `
  b.id, b.user_id, b.name, b.state, b.paper_mode, b.wallet_pubkey, b.signer_kind,
  b.region, b.expert_mode, b.config_version, b.created_at, b.last_active_at,
  b.allocated_lamports / 1e9        AS allocated_sol,
  b.observed_balance_lamports / 1e9 AS observed_sol,
  b.cap_sol_lamports / 1e9          AS cap_sol,
  b.drawdown_stop_lamports / 1e9    AS drawdown_stop_sol,
  b.spend_limit_lamports / 1e9      AS spend_limit_sol,
  ${FREE_BALANCE_SQL} / 1e9         AS free_sol`;

type RawBot = Record<string, unknown>;

function toSummary(
  b: RawBot,
  agg: Record<string, unknown> | undefined,
  pos: Record<string, unknown> | undefined,
): BotSummaryRow {
  return {
    botId: String(b.id),
    name: String(b.name ?? ""),
    state: String(b.state ?? ""),
    paperMode: Boolean(b.paper_mode),
    walletPubkey: String(b.wallet_pubkey ?? ""),
    signerKind: String(b.signer_kind ?? ""),
    region: String(b.region ?? ""),
    expertMode: Boolean(b.expert_mode),
    configVersion: int(b.config_version),
    createdAt: iso(b.created_at),
    lastActiveAt: iso(b.last_active_at),

    freeSol: num(b.free_sol),
    allocatedSol: num(b.allocated_sol),
    observedSol: num(b.observed_sol),
    capSol: num(b.cap_sol),
    drawdownStopSol: num(b.drawdown_stop_sol),
    spendLimitSol: num(b.spend_limit_sol),

    fills: int(agg?.fills),
    paperFills: int(agg?.paper_fills),
    failedFills: int(agg?.failed_fills),
    volumeSol: num(agg?.volume_sol),
    realizedPnlSol: num(agg?.realized_pnl_sol),
    feesPaidSol: num(agg?.fees_paid_sol),
    openPositions: int(pos?.n),
    openCostSol: num(pos?.cost_sol),
    lastTradeAt: iso(agg?.last_trade_at),
  };
}

// -----------------------------------------------------------------------------

export async function fetchUserBots(userId: string): Promise<UserBotsPayload> {
  const pool = getTrenchersPool();
  const now = new Date().toISOString();
  if (!pool) return { user: null, bots: [], available: false, generatedAt: now };

  const [userR, botsR, aggR, posR] = await Promise.all([
    pool.query(
      `SELECT id, email, display_name, username, wallet_address, created_at,
              is_onboarded, live_trading_enabled
         FROM users WHERE id = $1`,
      [userId],
    ),
    pool.query(
      `SELECT ${BOT_COLUMNS} FROM bots b
        WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      [userId],
    ),
    pool.query(AGG_SQL),
    pool.query(POS_SQL),
  ]);

  const aggBy = new Map(aggR.rows.map((r) => [String(r.bot_id), r]));
  const posBy = new Map(posR.rows.map((r) => [String(r.bot_id), r]));
  const u = userR.rows[0];

  return {
    user: u
      ? {
          userId: String(u.id),
          email: (u.email as string) ?? null,
          name: (u.display_name as string) ?? (u.username as string) ?? null,
          walletAddress: (u.wallet_address as string) ?? null,
          joinedAt: iso(u.created_at),
          isOnboarded: Boolean(u.is_onboarded),
          liveTradingEnabled: Boolean(u.live_trading_enabled),
        }
      : null,
    bots: botsR.rows.map((b) =>
      toSummary(b, aggBy.get(String(b.id)), posBy.get(String(b.id))),
    ),
    available: true,
    generatedAt: now,
  };
}

export async function fetchBotDetail(botId: string): Promise<BotDetailPayload> {
  const pool = getTrenchersPool();
  const now = new Date().toISOString();
  if (!pool) {
    return {
      bot: null,
      positions: [],
      trades: [],
      tradeCount: 0,
      available: false,
      generatedAt: now,
    };
  }

  const [botR, aggR, posAggR, positionsR, tradesR, countR] = await Promise.all([
    pool.query(
      `SELECT ${BOT_COLUMNS}, b.config, u.email AS user_email
         FROM bots b LEFT JOIN users u ON u.id = b.user_id
        WHERE b.id = $1`,
      [botId],
    ),
    pool.query(`${AGG_SQL} HAVING bot_id = $1`, [botId]),
    pool.query(`${POS_SQL} HAVING bot_id = $1`, [botId]),
    pool.query(
      `SELECT mint, token_amount, sol_cost / 1e9 AS sol_cost, entry_bc_pct,
              peak_mult, next_tier, opened_at
         FROM bot_positions WHERE bot_id = $1 ORDER BY opened_at DESC`,
      [botId],
    ),
    pool.query(
      `SELECT id, side, mint, tier_index, sol_amount / 1e9 AS sol_amount,
              token_amount, status, signature,
              pnl_lamports / 1e9                   AS pnl_sol,
              fees_lamports / 1e9                  AS fees_sol,
              priority_fee_lamports / 1e9          AS priority_fee_sol,
              COALESCE(jito_tip_lamports, 0) / 1e9 AS jito_tip_sol,
              lander_won, slot, reason, created_at
         FROM bot_trades WHERE bot_id = $1
        ORDER BY created_at DESC LIMIT ${TRADE_LIMIT}`,
      [botId],
    ),
    pool.query(`SELECT count(*) AS n FROM bot_trades WHERE bot_id = $1`, [
      botId,
    ]),
  ]);

  const b = botR.rows[0];
  if (!b) {
    return {
      bot: null,
      positions: [],
      trades: [],
      tradeCount: 0,
      available: true,
      generatedAt: now,
    };
  }

  return {
    bot: {
      ...toSummary(b, aggR.rows[0], posAggR.rows[0]),
      userId: String(b.user_id),
      userEmail: (b.user_email as string) ?? null,
      config: b.config,
    },
    positions: positionsR.rows.map((p) => ({
      mint: String(p.mint),
      tokenAmount: String(p.token_amount),
      solCost: num(p.sol_cost),
      entryBcPct: p.entry_bc_pct === null ? null : num(p.entry_bc_pct),
      peakMult: num(p.peak_mult),
      nextTier: int(p.next_tier),
      openedAt: iso(p.opened_at),
    })),
    trades: tradesR.rows.map((t) => ({
      id: String(t.id),
      side: String(t.side),
      mint: String(t.mint),
      tierIndex: t.tier_index === null ? null : int(t.tier_index),
      solAmount: num(t.sol_amount),
      tokenAmount: String(t.token_amount),
      status: String(t.status),
      signature: (t.signature as string) ?? null,
      pnlSol: t.pnl_sol === null ? null : num(t.pnl_sol),
      feesSol: num(t.fees_sol),
      priorityFeeSol: num(t.priority_fee_sol),
      jitoTipSol: num(t.jito_tip_sol),
      landerWon: (t.lander_won as string) ?? null,
      slot: t.slot === null ? null : String(t.slot),
      reason: (t.reason as string) ?? null,
      createdAt: iso(t.created_at),
    })),
    tradeCount: int(countR.rows[0]?.n),
    available: true,
    generatedAt: now,
  };
}
