// =============================================================================
// verify-pulse - proves the Live pulse numbers are arithmetically correct
// =============================================================================
//
// Runs the REAL `fetchPlatformPulse()` against a throwaway Postgres seeded with
// a fixture built to be hostile: NULL signatures, failed and pending fills,
// USDC fees, paper rows of every shape, withdrawal-only users, non-SOL quoted
// manual trades, and users sitting exactly on the 7d and 30d window edges.
//
// The expected values are computed by INDEPENDENT naive JS loops over the same
// in-memory fixture. That is the whole point: if the expectations were derived
// from the same SQL, the test would only prove the SQL equals itself. Two
// implementations that disagree mean one of them is wrong, and the disagreement
// is what we want surfaced.
//
// Usage:
//   docker run -d --name pulse-verify -e POSTGRES_PASSWORD=pw \
//     -e POSTGRES_DB=trench -p 55432:5432 postgres:16
//   <apply wt-multi-wallet-be/migrations in filename order>
//   TRENCHERS_DATABASE_URL=postgres://postgres:pw@localhost:55432/trench \
//     npx tsx scripts/verify-pulse.ts

import { Pool } from "pg";

import { fetchPlatformPulse } from "@/src/lib/trenchers-pulse";

const URL = process.env.TRENCHERS_DATABASE_URL;
if (!URL) {
  console.error("TRENCHERS_DATABASE_URL must point at the THROWAWAY db.");
  process.exit(1);
}
if (!/localhost|127\.0\.0\.1/.test(URL)) {
  // This script writes. It must never be aimed at production.
  console.error("Refusing to run: URL is not localhost. This script INSERTS.");
  process.exit(1);
}

const pool = new Pool({ connectionString: URL, max: 4 });
const q = async (s: string, p: unknown[] = []) => (await pool.query(s, p)).rows;

const U = (n: number) => `${String(n).padStart(8, "0")}-0000-0000-0000-000000000000`;
const B = (n: number) => `${String(n).padStart(8, "0")}-1111-0000-0000-000000000000`;
const T = (n: number) => `${String(n).padStart(8, "0")}-2222-0000-0000-000000000000`;

// -----------------------------------------------------------------------------
// Fixture, described once as plain data.
// -----------------------------------------------------------------------------

type UserF = { n: number; onboarded: boolean; live: boolean; signupHrs: number };
type DepF = { user: number; lamports: number; hrs: number };
type BotF = { n: number; user: number; paper: boolean; state: string; balance: number };
type BotTradeF = {
  n: number;
  bot: number;
  user: number;
  side: string;
  solLamports: number;
  sig: string | null;
  status: string;
  pnl: number | null;
  hrs: number;
  lander: string | null;
  prio: number;
  tip: number;
  capture: number;
};
type TradeF = {
  n: number;
  user: number;
  side: string;
  input: number;
  output: number;
  sig: string;
  status: string;
  quote: string;
  hrs: number;
};
type FeeF = {
  tradeN: number;
  user: number;
  bot: number;
  lamports: number;
  token: string;
  sig: string;
  kind: string;
  hrs: number;
};

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const users: UserF[] = [
  { n: 1, onboarded: true, live: true, signupHrs: 100 },
  { n: 2, onboarded: true, live: true, signupHrs: 80 },
  { n: 3, onboarded: false, live: false, signupHrs: 60 },
  { n: 4, onboarded: true, live: true, signupHrs: 40 },
  { n: 5, onboarded: false, live: true, signupHrs: 20 },
  // Signed up 40 days ago: outside the 30d signup window, inside all-time.
  { n: 6, onboarded: true, live: false, signupHrs: 24 * 40 },
  // Signed up 10 days ago: inside 30d, outside 7d.
  { n: 7, onboarded: false, live: true, signupHrs: 24 * 10 },
];

const deposits: DepF[] = [
  { user: 1, lamports: 10_000_000_000, hrs: 90 },
  { user: 1, lamports: -3_000_000_000, hrs: 50 },
  { user: 2, lamports: 5_000_000_000, hrs: 70 },
  { user: 4, lamports: 2_500_000_000, hrs: 10 }, // inside 24h
  { user: 4, lamports: 1_000_000_000, hrs: 100 }, // outside 7d? no, 100h < 168h
  // Withdrawal-only user: must NOT count as a depositor.
  { user: 5, lamports: -500_000_000, hrs: 30 },
  { user: 7, lamports: 8_000_000_000, hrs: 24 * 9 }, // outside 7d
];

const bots: BotF[] = [
  { n: 1, user: 1, paper: false, state: "active", balance: 3_000_000_000 },
  { n: 2, user: 1, paper: true, state: "paused", balance: 999_000_000 },
  { n: 3, user: 2, paper: false, state: "funded", balance: 1_000_000_000 },
  { n: 4, user: 3, paper: true, state: "active", balance: 777_000_000 },
  { n: 5, user: 4, paper: false, state: "active", balance: 2_000_000_000 },
  { n: 6, user: 6, paper: true, state: "draft", balance: 0 },
];

const botTrades: BotTradeF[] = [
  // u1 live: a winning sell and a losing sell -> bot 1 net positive.
  { n: 1, bot: 1, user: 1, side: "sell", solLamports: 2_000_000_000, sig: "real1", status: "confirmed", pnl: 1_000_000_000, hrs: 3, lander: "jito", prio: 5_000_000, tip: 2_000_000, capture: 1_000_000 },
  { n: 2, bot: 1, user: 1, side: "sell", solLamports: 1_000_000_000, sig: "real2", status: "confirmed", pnl: -400_000_000, hrs: 5, lander: "helius", prio: 3_000_000, tip: 0, capture: 500_000 },
  // Failed fill: excluded from volume and DAU, counted in the 24h fail rate.
  { n: 3, bot: 1, user: 1, side: "buy", solLamports: 9_000_000_000, sig: "real3", status: "failed", pnl: null, hrs: 4, lander: null, prio: 0, tip: 0, capture: 0 },
  // Pending: excluded from everything (neither confirmed nor failed).
  { n: 4, bot: 1, user: 1, side: "buy", solLamports: 7_000_000_000, sig: "real4", status: "pending", pnl: null, hrs: 2, lander: null, prio: 0, tip: 0, capture: 0 },
  // NULL signature: NOT live. `NOT LIKE 'paper%'` is NULL-unsafe by design.
  { n: 5, bot: 1, user: 1, side: "sell", solLamports: 5_000_000_000, sig: null, status: "confirmed", pnl: 5_000_000_000, hrs: 6, lander: "tpu", prio: 0, tip: 0, capture: 0 },
  // Paper fills with fat fake PnL.
  { n: 6, bot: 2, user: 1, side: "sell", solLamports: 8_000_000_000, sig: "paper-sell:a", status: "confirmed", pnl: 99_000_000_000, hrs: 3, lander: null, prio: 0, tip: 0, capture: 0 },
  { n: 7, bot: 4, user: 3, side: "sell", solLamports: 6_000_000_000, sig: "paper-sell:b", status: "confirmed", pnl: 20_000_000_000, hrs: 3, lander: null, prio: 0, tip: 0, capture: 0 },
  // u2 live, net negative bot.
  { n: 8, bot: 3, user: 2, side: "sell", solLamports: 4_000_000_000, sig: "real5", status: "confirmed", pnl: -1_500_000_000, hrs: 30, lander: "jito", prio: 1_000_000, tip: 500_000, capture: 0 },
  // u4 live, sell_partial with positive pnl, 10 days ago (outside 7d, inside 30d).
  { n: 9, bot: 5, user: 4, side: "sell_partial", solLamports: 3_000_000_000, sig: "real6", status: "confirmed", pnl: 250_000_000, hrs: 24 * 10, lander: "bloxroute", prio: 0, tip: 0, capture: 0 },
  // u4 again on a DIFFERENT day -> repeat trader within 30d.
  { n: 10, bot: 5, user: 4, side: "sell", solLamports: 1_000_000_000, sig: "real7", status: "confirmed", pnl: 100_000_000, hrs: 24 * 12, lander: "jito", prio: 0, tip: 0, capture: 0 },
  // u7 traded 9 days ago only -> in the 14d..7d window, silent since = churned.
  { n: 11, bot: 5, user: 7, side: "sell", solLamports: 2_000_000_000, sig: "real8", status: "confirmed", pnl: -50_000_000, hrs: 24 * 9, lander: "jito", prio: 0, tip: 0, capture: 0 },
];

const trades: TradeF[] = [
  // u2 manual SOL-quoted buy, today -> DAU.
  { n: 1, user: 2, side: "buy", input: 4, output: 1000, sig: "mreal1", status: "confirmed", quote: SOL_MINT, hrs: 2 },
  // u5 manual sell, SOL-quoted: the SOL leg is the OUTPUT on a sell.
  { n: 2, user: 5, side: "sell", input: 1000, output: 6, sig: "mreal2", status: "confirmed", quote: SOL_MINT, hrs: 5 },
  // Paper manual: excluded.
  { n: 3, user: 1, side: "buy", input: 77, output: 1000, sig: "paper-buy:c", status: "confirmed", quote: SOL_MINT, hrs: 2 },
  // USDC-quoted: excluded from SOL volume, but the USER still counts as trading.
  { n: 4, user: 6, side: "buy", input: 500, output: 1000, sig: "mreal3", status: "confirmed", quote: USDC_MINT, hrs: 3 },
  // Failed manual: excluded entirely.
  { n: 5, user: 6, side: "buy", input: 999, output: 1000, sig: "mreal4", status: "failed", quote: SOL_MINT, hrs: 3 },
];

const fees: FeeF[] = [
  { tradeN: 1, user: 1, bot: 1, lamports: 20_000_000, token: "SOL", sig: "real1", kind: "bot", hrs: 3 },
  { tradeN: 2, user: 1, bot: 1, lamports: 10_000_000, token: "SOL", sig: "real2", kind: "bot", hrs: 5 },
  { tradeN: 8, user: 2, bot: 3, lamports: 4_000_000, token: "SOL", sig: "mreal1", kind: "manual", hrs: 2 },
  // 10 days old: outside 7d and 24h, inside all-time.
  { tradeN: 9, user: 4, bot: 5, lamports: 6_000_000, token: "SOL", sig: "real6", kind: "bot", hrs: 24 * 10 },
  // USDC fee: excluded from every SOL revenue figure.
  { tradeN: 8, user: 2, bot: 3, lamports: 50_000_000, token: "USDC", sig: "real5", kind: "manual", hrs: 2 },
  // Paper fee: excluded.
  { tradeN: 6, user: 1, bot: 2, lamports: 90_000_000, token: "SOL", sig: "paper-sell:a", kind: "bot", hrs: 3 },
];

// -----------------------------------------------------------------------------
// Seed
// -----------------------------------------------------------------------------

async function seed(dbNow: Date) {
  const at = (hrs: number) => new Date(dbNow.getTime() - hrs * 3_600_000);

  for (const t of ["fee_ledger", "bot_trades", "trades", "bot_positions", "bots", "wallet_deposits", "user_points", "referrals", "orders", "watchlist", "tracked_wallets", "copy_targets", "sniper_configs", "user_quest_awards", "login_whitelist", "wallet_balances", "users"]) {
    await q(`DELETE FROM ${t}`);
  }

  for (const u of users) {
    await q(
      `INSERT INTO users (id, wallet_address, display_name, email, is_onboarded, live_trading_enabled, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [U(u.n), `Wal${u.n}`, `User${u.n}`, `u${u.n}@x.com`, u.onboarded, u.live, at(u.signupHrs)],
    );
  }
  let ds = 0;
  for (const d of deposits) {
    await q(
      `INSERT INTO wallet_deposits (signature, wallet, user_id, block_time, delta_lamports, kind)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [`dep${ds++}`, `Wal${d.user}`, U(d.user), at(d.hrs), d.lamports, d.lamports > 0 ? "deposit" : "withdrawal"],
    );
  }
  for (const b of bots) {
    await q(
      `INSERT INTO bots (id, user_id, name, state, wallet_pubkey, signer_kind, signer_ref, config, paper_mode, observed_balance_lamports)
       VALUES ($1,$2,$3,$4,$5,'privy',$6,'{}'::jsonb,$7,$8)`,
      [B(b.n), U(b.user), `bot${b.n}`, b.state, `BotWal${b.n}`, `pv${b.n}`, b.paper, b.balance],
    );
  }
  for (const t of botTrades) {
    await q(
      `INSERT INTO bot_trades (id, bot_id, user_id, mint, side, sol_amount, token_amount, signature, status,
                               pnl_lamports, priority_fee_lamports, jito_tip_lamports,
                               platform_priority_capture_lamports, fee_bps_applied, rank_at_trade, lander_won, created_at)
       VALUES ($1,$2,$3,'MintX',$4,$5,100,$6,$7,$8,$9,$10,$11,100,1,$12,$13)`,
      [T(t.n), B(t.bot), U(t.user), t.side, t.solLamports, t.sig, t.status, t.pnl, t.prio, t.tip, t.capture, t.lander, at(t.hrs)],
    );
  }
  for (const t of trades) {
    await q(
      `INSERT INTO trades (id, user_id, token_mint, side, input_amount, output_amount, price, signature, status, quote_mint, created_at)
       VALUES ($1,$2,'MintY',$3,$4,$5,1,$6,$7,$8,$9)`,
      [`${String(t.n).padStart(8, "0")}-3333-0000-0000-000000000000`, U(t.user), t.side, t.input, t.output, t.sig, t.status, t.quote, at(t.hrs)],
    );
  }
  for (const f of fees) {
    await q(
      `INSERT INTO fee_ledger (trade_id, user_id, bot_id, fee_lamports, fee_token, fee_account, rank_at_trade, bps_applied, signature, kind, created_at)
       VALUES ($1,$2,$3,$4,$5,'Acct',1,100,$6,$7,$8)`,
      [T(f.tradeN), U(f.user), B(f.bot), f.lamports, f.token, f.sig, f.kind, at(f.hrs)],
    );
  }

  // Open positions: one live, one paper (paper must be excluded).
  // `sol_cost` is WHOLE LAMPORTS, per st-db/src/repo_bots.rs: the
  // `bot_deployed_sol` view is documented as "Σ open-position sol_cost, whole
  // lamports". The column being NUMERIC(20,10) and named sol_* invites the
  // opposite reading, which is precisely why this is asserted.
  await q(`INSERT INTO bot_positions (bot_id, mint, token_amount, sol_cost, opened_at) VALUES ($1,'MintP',100,1500000000,now())`, [B(1)]);
  await q(`INSERT INTO bot_positions (bot_id, mint, token_amount, sol_cost, opened_at) VALUES ($1,'MintQ',100,9000000000,now())`, [B(2)]);

  // Adoption surfaces.
  await q(`INSERT INTO user_points (user_id, gold) VALUES ($1, 10), ($2, 0)`, [U(1), U(2)]);
  await q(`INSERT INTO referrals (user_id, code, referred_by) VALUES ($1,'c1',NULL), ($2,'c2',$1)`, [U(1), U(2)]);
  await q(`INSERT INTO watchlist (user_id, mint) VALUES ($1,'M1'), ($1,'M2'), ($2,'M1')`, [U(1), U(2)]);
  await q(`INSERT INTO sniper_configs (user_id, config, enabled) VALUES ($1,'{}'::jsonb,true), ($2,'{}'::jsonb,false)`, [U(1), U(2)]);
  await q(`INSERT INTO login_whitelist (id, kind, value, enabled) VALUES (gen_random_uuid(),'email','a@b.c',true), (gen_random_uuid(),'email','d@e.f',false)`);
  await q(`INSERT INTO wallet_balances (wallet, sol_lamports, balance_at) VALUES ('Wal1', 4000000000, now())`);
}

// -----------------------------------------------------------------------------
// Independent expectations: naive loops, deliberately not mirroring the SQL.
// -----------------------------------------------------------------------------

function expectations(dbNow: Date) {
  const ms = dbNow.getTime();
  const hoursAgo = (hrs: number) => ms - hrs * 3_600_000;
  const since = (hrs: number) => (rowHrs: number) => hoursAgo(rowHrs) >= ms - hrs * 3_600_000;
  const in24h = since(24);
  const in7d = since(24 * 7);
  const in30d = since(24 * 30);

  // UTC midnight of the DB's current day.
  const todayStart = Date.UTC(dbNow.getUTCFullYear(), dbNow.getUTCMonth(), dbNow.getUTCDate());
  const isToday = (rowHrs: number) => hoursAgo(rowHrs) >= todayStart;

  const isLiveSig = (s: string | null) => s !== null && !s.startsWith("paper");

  // Every confirmed, non-paper fill from BOTH engines.
  const liveFills: { user: number; hrs: number }[] = [
    ...botTrades.filter((t) => t.status === "confirmed" && isLiveSig(t.sig)).map((t) => ({ user: t.user, hrs: t.hrs })),
    ...trades.filter((t) => t.status === "confirmed" && isLiveSig(t.sig)).map((t) => ({ user: t.user, hrs: t.hrs })),
  ];
  const uniq = (xs: number[]) => [...new Set(xs)];

  const traders = uniq(liveFills.map((f) => f.user));
  const dau = uniq(liveFills.filter((f) => isToday(f.hrs)).map((f) => f.user));
  const wau = uniq(liveFills.filter((f) => in7d(f.hrs)).map((f) => f.user));
  const mau = uniq(liveFills.filter((f) => in30d(f.hrs)).map((f) => f.user));

  // Repeat traders: >= 2 distinct UTC days in the last 30.
  const dayKey = (hrs: number) => new Date(hoursAgo(hrs)).toISOString().slice(0, 10);
  const daysByUser = new Map<number, Set<string>>();
  for (const f of liveFills.filter((f) => in30d(f.hrs))) {
    if (!daysByUser.has(f.user)) daysByUser.set(f.user, new Set());
    daysByUser.get(f.user)!.add(dayKey(f.hrs));
  }
  const repeatTraders = [...daysByUser.values()].filter((s) => s.size >= 2).length;

  // Churned: traded in 14d..7d, silent in the last 7d.
  const prevWindow = uniq(liveFills.filter((f) => in7d(f.hrs) === false && in30d(f.hrs) && hoursAgo(f.hrs) >= ms - 24 * 14 * 3_600_000).map((f) => f.user));
  const churned = prevWindow.filter((u) => !wau.includes(u)).length;

  // New traders: first ever fill within 7d.
  const firstByUser = new Map<number, number>();
  for (const f of liveFills) {
    const t = hoursAgo(f.hrs);
    if (!firstByUser.has(f.user) || t < firstByUser.get(f.user)!) firstByUser.set(f.user, t);
  }
  const newTraders = [...firstByUser.values()].filter((t) => t >= ms - 24 * 7 * 3_600_000).length;

  // Money.
  const dep = deposits.filter((d) => d.lamports > 0);
  const wdr = deposits.filter((d) => d.lamports < 0);
  const depositedSol = dep.reduce((s, d) => s + d.lamports, 0) / 1e9;
  const withdrawnSol = -wdr.reduce((s, d) => s + d.lamports, 0) / 1e9;
  const depositors = uniq(dep.map((d) => d.user));
  const netByUser = new Map<number, number>();
  for (const d of deposits) netByUser.set(d.user, (netByUser.get(d.user) ?? 0) + d.lamports);
  const depositorNets = depositors.map((u) => (netByUser.get(u) ?? 0) / 1e9).sort((a, b) => a - b);
  const percentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const idx = (arr.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return lo === hi ? arr[lo] : arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
  };

  // Revenue: SOL only, non-paper.
  const solFees = fees.filter((f) => f.token === "SOL" && isLiveSig(f.sig));
  const feeSol = solFees.reduce((s, f) => s + f.lamports, 0) / 1e9;

  // Volume across both engines.
  const botVol = botTrades.filter((t) => t.status === "confirmed" && isLiveSig(t.sig)).reduce((s, t) => s + t.solLamports, 0) / 1e9;
  const manualVol = trades.filter((t) => t.status === "confirmed" && isLiveSig(t.sig) && t.quote === SOL_MINT).reduce((s, t) => s + (t.side === "buy" ? t.input : t.output), 0);

  // Bots.
  const liveBots = bots.filter((b) => !b.paper).length;
  const paperBots = bots.filter((b) => b.paper).length;
  const realBotTrades = botTrades.filter((t) => t.status === "confirmed" && isLiveSig(t.sig) && t.pnl !== null);
  const realizedPnl = realBotTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) / 1e9;
  const wins = realBotTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const losses = realBotTrades.filter((t) => (t.pnl ?? 0) < 0).length;
  const pnlByBot = new Map<number, number>();
  for (const t of realBotTrades) pnlByBot.set(t.bot, (pnlByBot.get(t.bot) ?? 0) + (t.pnl ?? 0));
  const profitableBots = [...pnlByBot.values()].filter((v) => v > 0).length;
  const unprofitableBots = [...pnlByBot.values()].filter((v) => v < 0).length;

  const botsByUser = new Map<number, { paper: boolean[]; }>();
  for (const b of bots) {
    if (!botsByUser.has(b.user)) botsByUser.set(b.user, { paper: [] });
    botsByUser.get(b.user)!.paper.push(b.paper);
  }
  let converted = 0, paperOnly = 0;
  for (const { paper } of botsByUser.values()) {
    const hadPaper = paper.some((p) => p), hadLive = paper.some((p) => !p);
    if (hadPaper && hadLive) converted++;
    else if (hadPaper && !hadLive) paperOnly++;
  }

  // Execution, last 24h.
  const in24hBot = botTrades.filter((t) => isLiveSig(t.sig) && in24h(t.hrs));
  const confirmed24h = in24hBot.filter((t) => t.status === "confirmed").length;
  const failed24h = in24hBot.filter((t) => t.status === "failed").length;
  const fees7d = botTrades.filter((t) => t.status === "confirmed" && isLiveSig(t.sig) && in7d(t.hrs));

  return {
    totalUsers: users.length,
    onboardedUsers: users.filter((u) => u.onboarded).length,
    liveTradingEnabled: users.filter((u) => u.live).length,
    new7d: users.filter((u) => in7d(u.signupHrs)).length,
    new30d: users.filter((u) => in30d(u.signupHrs)).length,

    funnelDeposited: depositors.length,
    funnelTraded: traders.length,
    funnelBotSpawned: uniq(bots.filter((b) => !b.paper).map((b) => b.user)).length,
    funnelBotActive: uniq(bots.filter((b) => !b.paper && b.state === "active").map((b) => b.user)).length,

    dau: dau.length,
    wau: wau.length,
    mau: mau.length,
    repeatTraders,
    churned7d: churned,
    newTraders7d: newTraders,

    depositedSol,
    withdrawnSol,
    netDepositedSol: depositedSol - withdrawnSol,
    depositorCount: depositors.length,
    medianNetSol: percentile(depositorNets, 0.5),
    p90NetSol: percentile(depositorNets, 0.9),
    deposited24hSol: dep.filter((d) => in24h(d.hrs)).reduce((s, d) => s + d.lamports, 0) / 1e9,
    walletBalanceSol: 4,
    botBalanceSol: bots.filter((b) => !b.paper).reduce((s, b) => s + b.balance, 0) / 1e9,

    feeSol,
    fee24hSol: solFees.filter((f) => in24h(f.hrs)).reduce((s, f) => s + f.lamports, 0) / 1e9,
    volumeSol: botVol + manualVol,

    liveBots,
    paperBots,
    activeLiveBots: bots.filter((b) => !b.paper && b.state === "active").length,
    realizedPnlSol: realizedPnl,
    winningLegs: wins,
    losingLegs: losses,
    profitableBots,
    unprofitableBots,
    paperToLiveUsers: converted,
    paperOnlyUsers: paperOnly,
    openPositions: 1,
    openCostSol: 1.5,

    confirmed24h,
    failed24h,
    priorityFee7dSol: fees7d.reduce((s, t) => s + t.prio, 0) / 1e9,
    jitoTip7dSol: fees7d.reduce((s, t) => s + t.tip, 0) / 1e9,
    priorityCapture7dSol: fees7d.reduce((s, t) => s + t.capture, 0) / 1e9,

    referredUsers: 1,
    pointsUsers: 1,
    whitelistEnabled: 1,
    adoptionWatchlist: 2,
    adoptionSniper: 1,
  };
}

// -----------------------------------------------------------------------------

const EPS = 1e-9;

async function main() {
  const dbNow = new Date((await q("SELECT now() AS n"))[0].n);
  await seed(dbNow);

  const got = await fetchPlatformPulse();
  const want = expectations(dbNow);

  const actual: Record<string, number> = {
    totalUsers: got.growth.totalUsers,
    onboardedUsers: got.growth.onboardedUsers,
    liveTradingEnabled: got.growth.liveTradingEnabled,
    new7d: got.growth.new7d,
    new30d: got.growth.new30d,

    funnelDeposited: got.funnel.find((f) => f.key === "deposited")!.users,
    funnelTraded: got.funnel.find((f) => f.key === "traded")!.users,
    funnelBotSpawned: got.funnel.find((f) => f.key === "bot")!.users,
    funnelBotActive: got.funnel.find((f) => f.key === "bot_active")!.users,

    dau: got.engagement.dau,
    wau: got.engagement.wau,
    mau: got.engagement.mau,
    repeatTraders: got.engagement.repeatTraders,
    churned7d: got.engagement.churned7d,
    newTraders7d: got.engagement.newTraders7d,

    depositedSol: got.money.depositedSol,
    withdrawnSol: got.money.withdrawnSol,
    netDepositedSol: got.money.netDepositedSol,
    depositorCount: got.money.depositorCount,
    medianNetSol: got.money.medianNetSol,
    p90NetSol: got.money.p90NetSol,
    deposited24hSol: got.money.deposited24hSol,
    walletBalanceSol: got.money.walletBalanceSol,
    botBalanceSol: got.money.botBalanceSol,

    feeSol: got.revenue.feeSol,
    fee24hSol: got.revenue.fee24hSol,
    volumeSol: got.revenue.volumeSol,

    liveBots: got.bots.liveBots,
    paperBots: got.bots.paperBots,
    activeLiveBots: got.bots.activeLiveBots,
    realizedPnlSol: got.bots.realizedPnlSol,
    winningLegs: got.bots.winningLegs,
    losingLegs: got.bots.losingLegs,
    profitableBots: got.bots.profitableBots,
    unprofitableBots: got.bots.unprofitableBots,
    paperToLiveUsers: got.bots.paperToLiveUsers,
    paperOnlyUsers: got.bots.paperOnlyUsers,
    openPositions: got.bots.openPositions,
    openCostSol: got.bots.openCostSol,

    confirmed24h: got.execution.confirmed24h,
    failed24h: got.execution.failed24h,
    priorityFee7dSol: got.execution.priorityFee7dSol,
    jitoTip7dSol: got.execution.jitoTip7dSol,
    priorityCapture7dSol: got.execution.priorityCapture7dSol,

    referredUsers: got.adoption.referredUsers,
    pointsUsers: got.adoption.pointsUsers,
    whitelistEnabled: got.adoption.whitelistEnabled,
    adoptionWatchlist: got.adoption.items.find((i) => i.key === "watchlist")!.users,
    adoptionSniper: got.adoption.items.find((i) => i.key === "sniper")!.users,
  };

  let pass = 0;
  const failures: string[] = [];
  for (const [k, expected] of Object.entries(want)) {
    const a = actual[k];
    if (Math.abs(a - expected) < EPS) {
      pass++;
    } else {
      failures.push(`  ${k.padEnd(24)} expected ${expected}   got ${a}`);
    }
  }

  console.log(`\n${pass}/${Object.keys(want).length} metrics correct`);
  if (failures.length) {
    console.log("\nFAILURES:");
    for (const f of failures) console.log(f);
  }

  // Derived-ratio sanity, checked separately because they are computed in JS.
  const wr = got.bots.winRate;
  const expectedWr = want.winningLegs / (want.winningLegs + want.losingLegs);
  console.log(`\nwinRate           ${wr}  (expected ${expectedWr})`);
  console.log(`confirmRate       ${got.execution.confirmRate}  (expected ${want.confirmed24h / (want.confirmed24h + want.failed24h)})`);
  console.log(`takeRateBps       ${got.revenue.takeRateBps}  (expected ${(want.feeSol / want.volumeSol) * 10000})`);
  console.log(`withdrawalRatio   ${got.money.withdrawalRatio}  (expected ${want.withdrawnSol / want.depositedSol})`);

  await pool.end();
  process.exit(failures.length ? 1 : 0);
}

void main();
