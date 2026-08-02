// =============================================================================
// trenchers-accounting — platform revenue vs giveback, read from the prod DB
// =============================================================================
//
// Powers the analytics page's "Platform accounting" dashboard. Answers one
// question: are we giving back more than we collect?
//
// Rakeback and referral commission are both shares of the same platform fee,
// and the fill path nets referral against rakeback
// (`net_fee = platform_fee - rakeback`). So the pair is bounded at 72.25% of a
// fee (Titan: 50% rakeback, then 44.5% of the remaining 50%) and floors at
// 50.05% (Bronze). Margin therefore ranges 27.75%–49.95% BY DESIGN.
//
// That guarantee is about the tier LADDER, not the bookkeeping. A fee recorded
// but never collected, an accrual booked twice, or a 6-decimal USDC amount read
// as lamports all break the relationship without any rate changing — which is
// why this module ships reconciliation invariants alongside the totals, and why
// the UI shows whether the books reconcile BEFORE it shows a number.
//
// These queries deliberately mirror `crates/st-db/src/repo_accounting.rs` in
// the solana-terminal repo, so this dashboard and the Grafana one agree. If you
// change the shape of a total here, change it there too.
//
// EVERYTHING IS DERIVED — there is no accounting summary table, on purpose. A
// summary table is a second version of the truth that can drift from the rows
// it summarises, which is the exact class of bug this dashboard exists to catch.

import { unstable_cache } from "next/cache";

import { getTrenchersPool } from "@/src/lib/trenchers-db";

const LAMPORTS_PER_SOL = 1_000_000_000;

/** Claim statuses representing money that has left, or is leaving, the payout
 *  wallet. `failed` releases its reservation and is excluded everywhere. */
const SETTLED_OR_INFLIGHT = "('confirmed', 'sent')";

/** Real fills only. Paper bots write `fee_ledger` rows with a synthetic
 *  `paper%` signature; counting those as revenue would inflate the margin with
 *  money that was never collected. The sibling trading dashboards filter the
 *  same way, so the two tabs always agree. */
const REAL_FILLS = "signature NOT LIKE 'paper%'";

export type AccountingTotals = {
  revenueLamports: number;
  revenueMicroUsdc: number;
  rakebackOwedLamports: number;
  rakebackPaidLamports: number;
  referralOwedLamports: number;
  referralPaidLamports: number;
  inFlightLamports: number;
  marginLamports: number;
  negativeMarginUsers: number;
  usersWithRevenue: number;
  feeEvents: number;
};

export type Invariant = {
  name: string;
  label: string;
  ok: boolean;
  detail: string;
  consequence: string;
};

export type UserLedgerRow = {
  userId: string;
  wallet: string | null;
  rank: string | null;
  feesInLamports: number;
  rakebackOwedLamports: number;
  referralCausedLamports: number;
  marginLamports: number;
  givebackPct: number | null;
};

/** One UTC day of collected fees vs rakeback accrued against them. */
export type AccountingDay = {
  date: string;
  revenue: number;
  rakeback: number;
  margin: number;
};

export type AccountingPayload = {
  totals: AccountingTotals;
  invariants: Invariant[];
  users: UserLedgerRow[];
  daily: AccountingDay[];
  /** Design bounds, so the UI never hardcodes them. */
  ceilingPct: number;
  floorPct: number;
  /** Known limits that apply even when every invariant passes. */
  caveats: string[];
  generatedAt: string;
};

function num(v: unknown): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/** Platform-wide totals in one round trip. Mirrors `PgAccountingRepo::totals`. */
async function loadTotals(): Promise<AccountingTotals> {
  const pool = getTrenchersPool();
  if (!pool) return emptyTotals();

  const { rows } = await pool.query(
    `WITH rev AS (
       SELECT COALESCE(SUM(fee_lamports) FILTER (WHERE fee_token = 'SOL'), 0)  AS sol,
              COALESCE(SUM(fee_lamports) FILTER (WHERE fee_token = 'USDC'), 0) AS usdc,
              COUNT(*) FILTER (WHERE fee_token = 'SOL')                        AS events,
              COUNT(DISTINCT user_id) FILTER (WHERE fee_token = 'SOL')         AS users
         FROM fee_ledger WHERE realised = true AND ${REAL_FILLS}
     ),
     rake AS (SELECT COALESCE(SUM(accrued_lamports), 0) AS owed FROM rakeback_accruals),
     ref  AS (SELECT COALESCE(SUM(commission_lamports), 0) AS owed FROM referral_earnings),
     paid AS (
       SELECT COALESCE(SUM(rakeback_lamports), 0) AS rake_paid,
              COALESCE(SUM(referral_lamports), 0) AS ref_paid
         FROM rakeback_claims WHERE status IN ${SETTLED_OR_INFLIGHT}
     ),
     flight AS (
       SELECT COALESCE(SUM(amount_lamports), 0) AS amt
         FROM rakeback_claims WHERE status IN ('pending', 'sent')
     ),
     per_user AS (
       SELECT u.id,
              COALESCE(r.sol, 0) - COALESCE(a.owed, 0) - COALESCE(c.caused, 0) AS margin
         FROM users u
         LEFT JOIN (SELECT user_id, SUM(fee_lamports) AS sol FROM fee_ledger
                     WHERE realised = true AND fee_token = 'SOL' AND ${REAL_FILLS}
                     GROUP BY user_id) r ON r.user_id = u.id
         LEFT JOIN (SELECT user_id, SUM(accrued_lamports) AS owed FROM rakeback_accruals
                     GROUP BY user_id) a ON a.user_id = u.id
         LEFT JOIN (SELECT source_user_id, SUM(commission_lamports) AS caused
                      FROM referral_earnings GROUP BY source_user_id) c ON c.source_user_id = u.id
     )
     SELECT rev.sol AS revenue, rev.usdc, rev.events, rev.users,
            rake.owed AS rake_owed, ref.owed AS ref_owed,
            paid.rake_paid, paid.ref_paid, flight.amt AS in_flight,
            (rev.sol - rake.owed - ref.owed) AS margin,
            (SELECT COUNT(*) FROM per_user WHERE margin < 0) AS negative_users
       FROM rev, rake, ref, paid, flight`,
  );

  const r = rows[0] ?? {};
  return {
    revenueLamports: num(r.revenue),
    revenueMicroUsdc: num(r.usdc),
    rakebackOwedLamports: num(r.rake_owed),
    rakebackPaidLamports: num(r.rake_paid),
    referralOwedLamports: num(r.ref_owed),
    referralPaidLamports: num(r.ref_paid),
    inFlightLamports: num(r.in_flight),
    marginLamports: num(r.margin),
    negativeMarginUsers: num(r.negative_users),
    usersWithRevenue: num(r.users),
    feeEvents: num(r.events),
  };
}

function emptyTotals(): AccountingTotals {
  return {
    revenueLamports: 0,
    revenueMicroUsdc: 0,
    rakebackOwedLamports: 0,
    rakebackPaidLamports: 0,
    referralOwedLamports: 0,
    referralPaidLamports: 0,
    inFlightLamports: 0,
    marginLamports: 0,
    negativeMarginUsers: 0,
    usersWithRevenue: 0,
    feeEvents: 0,
  };
}

/**
 * Reconciliation invariants. Each is a real defect when false, not a warning.
 *
 * Every one of these must be able to FAIL. An invariant that is true by
 * construction is worse than no invariant at all: it renders as a green trust
 * signal on a dashboard whose entire purpose is telling you whether the numbers
 * can be believed.
 */
async function loadInvariants(): Promise<Invariant[]> {
  const pool = getTrenchersPool();
  if (!pool) return [];

  const out: Invariant[] = [];
  const one = async (sql: string): Promise<Record<string, unknown>> => {
    const { rows } = await pool.query(sql);
    return (rows[0] ?? {}) as Record<string, unknown>;
  };

  // 1 + 2. Paid may never exceed accrued, per user. A breach means real SOL
  // left the payout wallet against an obligation that was never booked.
  const overpaid = await one(
    `SELECT COUNT(*) AS n FROM (
       SELECT c.user_id
         FROM (SELECT user_id, SUM(rakeback_lamports) v FROM rakeback_claims
                WHERE status IN ${SETTLED_OR_INFLIGHT} GROUP BY user_id) c
         LEFT JOIN (SELECT user_id, SUM(accrued_lamports) v FROM rakeback_accruals
                     GROUP BY user_id) a ON a.user_id = c.user_id
        WHERE c.v > COALESCE(a.v, 0)) x`,
  );
  out.push({
    name: "rakeback_paid_never_exceeds_accrued",
    label: "Rakeback paid never exceeds accrued",
    ok: num(overpaid.n) === 0,
    detail: `${num(overpaid.n)} user(s) paid more rakeback than accrued`,
    consequence: "Real SOL left the payout wallet twice for the same accrual.",
  });

  const overpaidRef = await one(
    `SELECT COUNT(*) AS n FROM (
       SELECT c.user_id
         FROM (SELECT user_id, SUM(referral_lamports) v FROM rakeback_claims
                WHERE status IN ${SETTLED_OR_INFLIGHT} GROUP BY user_id) c
         LEFT JOIN (SELECT earner_id user_id, SUM(commission_lamports) v
                      FROM referral_earnings GROUP BY earner_id) e ON e.user_id = c.user_id
        WHERE c.v > COALESCE(e.v, 0)) x`,
  );
  out.push({
    name: "referral_paid_never_exceeds_earned",
    label: "Referral paid never exceeds earned",
    ok: num(overpaidRef.n) === 0,
    detail: `${num(overpaidRef.n)} user(s) paid more commission than earned`,
    consequence: "Commission was paid against an obligation that was never booked.",
  });

  // 3. Nobody earns commission on their own trading. The commission selector
  // seeds its credited set with the trader's own id precisely to make this
  // impossible, so a row like this means that guard failed.
  const selfRef = await one(
    `SELECT COUNT(*) AS n FROM referral_earnings WHERE earner_id = source_user_id`,
  );
  out.push({
    name: "no_self_referral_commission",
    label: "No self-referral commission",
    ok: num(selfRef.n) === 0,
    detail: `${num(selfRef.n)} row(s) where earner = source`,
    consequence: "A user is earning referral commission on their own trades.",
  });

  // 4. Referral accrues on the fee NET of rakeback, so platform-wide it cannot
  // exceed 44.5% of what remains. Deliberately loose (5% headroom, skipped at
  // zero revenue): it compares all-time totals across different accrual times,
  // so it exists to catch a structural breach, not rounding drift.
  const ceiling = await one(
    `SELECT
       COALESCE((SELECT SUM(fee_lamports) FROM fee_ledger
                  WHERE realised = true AND fee_token = 'SOL' AND ${REAL_FILLS}), 0) AS revenue,
       COALESCE((SELECT SUM(accrued_lamports) FROM rakeback_accruals), 0) AS rake,
       COALESCE((SELECT SUM(commission_lamports) FROM referral_earnings), 0) AS ref`,
  );
  const revenue = num(ceiling.revenue);
  const netBase = Math.max(revenue - num(ceiling.rake), 0);
  const cap = Math.floor((netBase * 4950) / 10_000); // 44.5% + 5% slack
  out.push({
    name: "referral_within_netting_ceiling",
    label: "Referral within the netting ceiling",
    ok: revenue === 0 || num(ceiling.ref) <= cap,
    detail: `referral owed ${num(ceiling.ref).toLocaleString()} vs ceiling ${cap.toLocaleString()} lamports`,
    consequence:
      "Referral is being commissioned on the gross fee, not the fee net of rakeback.",
  });

  // 5. No accrual may reference a non-SOL fee. The join mirrors the writers'
  // own keys: the bot sweep stores `fee_ledger.id` in source_ref, while the
  // manual writers store a signature. Checking only one shape would leave this
  // green through the exact defect it is named for.
  const usdcAccrual = await one(
    `SELECT COUNT(*) AS n FROM rakeback_accruals a
      WHERE EXISTS (
        SELECT 1 FROM fee_ledger f
        LEFT JOIN trades t ON t.id = f.trade_id
         WHERE f.fee_token <> 'SOL'
           AND ( (a.source =  'bot' AND f.id::text = a.source_ref)
              OR (a.source <> 'bot'
                  AND COALESCE(t.signature, f.signature) = a.source_ref) ))`,
  );
  out.push({
    name: "no_usdc_fees_in_the_lamport_accrual_ledger",
    label: "No USDC fees in the lamport accrual ledger",
    ok: num(usdcAccrual.n) === 0,
    detail: `${num(usdcAccrual.n)} accrual(s) reference a non-SOL fee`,
    consequence:
      "6-decimal USDC is being read as lamports; accruals are ~6.7x too small.",
  });

  // 6. One in-flight claim per user. A partial unique index enforces it; this
  // catches the index having been dropped.
  const multiFlight = await one(
    `SELECT COUNT(*) AS n FROM (
       SELECT user_id FROM rakeback_claims WHERE status IN ('pending','sent')
        GROUP BY user_id HAVING COUNT(*) > 1) x`,
  );
  out.push({
    name: "at_most_one_in_flight_claim_per_user",
    label: "At most one in-flight claim per user",
    ok: num(multiFlight.n) === 0,
    detail: `${num(multiFlight.n)} user(s) with more than one unsettled claim`,
    consequence: "Concurrent claims can double-spend the same accrued balance.",
  });

  return out;
}

/** Per-user ledger, worst margin first so a loss is the first row seen. */
async function loadUserLedger(limit = 50): Promise<UserLedgerRow[]> {
  const pool = getTrenchersPool();
  if (!pool) return [];

  // A user's cost is their OWN rakeback plus the commission their trading
  // obliged us to pay upline — keyed on `source_user_id`, not `earner_id`.
  // Summing by earner would charge a whale's commissions to their referrer,
  // making the whale look profitable while the loss sat on someone else's row.
  const { rows } = await pool.query(
    `WITH rev AS (
       SELECT user_id, SUM(fee_lamports) AS sol
         FROM fee_ledger
        WHERE realised = true AND fee_token = 'SOL' AND ${REAL_FILLS}
        GROUP BY user_id
     ),
     rake AS (SELECT user_id, SUM(accrued_lamports) v FROM rakeback_accruals GROUP BY user_id),
     caused AS (SELECT source_user_id user_id, SUM(commission_lamports) v
                  FROM referral_earnings GROUP BY source_user_id)
     SELECT u.id::text        AS user_id,
            u.wallet_address  AS wallet,
            p.rank            AS rank,
            COALESCE(rev.sol, 0)    AS fees_in,
            COALESCE(rake.v, 0)     AS rake_owed,
            COALESCE(caused.v, 0)   AS ref_caused,
            COALESCE(rev.sol, 0) - COALESCE(rake.v, 0) - COALESCE(caused.v, 0) AS margin
       FROM users u
       LEFT JOIN rev    ON rev.user_id = u.id
       LEFT JOIN rake   ON rake.user_id = u.id
       LEFT JOIN caused ON caused.user_id = u.id
       LEFT JOIN user_points p ON p.user_id = u.id
      WHERE COALESCE(rev.sol, 0) > 0 OR COALESCE(rake.v, 0) > 0 OR COALESCE(caused.v, 0) > 0
      ORDER BY margin ASC
      LIMIT $1`,
    [limit],
  );

  return rows.map((r) => {
    const feesIn = num(r.fees_in);
    const giveback = num(r.rake_owed) + num(r.ref_caused);
    return {
      userId: String(r.user_id),
      wallet: r.wallet ? String(r.wallet) : null,
      rank: r.rank ? String(r.rank) : null,
      feesInLamports: feesIn,
      rakebackOwedLamports: num(r.rake_owed),
      referralCausedLamports: num(r.ref_caused),
      marginLamports: num(r.margin),
      // No revenue means no meaningful ratio. 0% would read as perfectly
      // healthy, which is the opposite of the truth for an all-cost user.
      givebackPct: feesIn > 0 ? (giveback / feesIn) * 100 : null,
    };
  });
}

/**
 * Daily fees collected vs rakeback accrued against them.
 *
 * Referral is deliberately ABSENT from this series. `referral_earnings` is an
 * upsert aggregate keyed on (earner, source) with no per-event history, so any
 * per-day referral figure derived from it would be fiction. The all-time
 * referral total in the summary cards is accurate; a daily split is not
 * available without an event log.
 */
async function loadDaily(): Promise<AccountingDay[]> {
  const pool = getTrenchersPool();
  if (!pool) return [];

  const { rows } = await pool.query(
    `WITH rev AS (
       SELECT to_char(date(created_at), 'YYYY-MM-DD') AS d, SUM(fee_lamports) AS v
         FROM fee_ledger
        WHERE realised = true AND fee_token = 'SOL' AND ${REAL_FILLS}
        GROUP BY 1
     ),
     rake AS (
       SELECT to_char(date(created_at), 'YYYY-MM-DD') AS d, SUM(accrued_lamports) AS v
         FROM rakeback_accruals GROUP BY 1
     )
     SELECT COALESCE(rev.d, rake.d) AS date,
            COALESCE(rev.v, 0)  AS revenue,
            COALESCE(rake.v, 0) AS rakeback
       FROM rev FULL OUTER JOIN rake ON rev.d = rake.d
      ORDER BY 1`,
  );

  return rows.map((r) => {
    const revenue = lamportsToSol(num(r.revenue));
    const rakeback = lamportsToSol(num(r.rakeback));
    return {
      date: String(r.date),
      revenue,
      rakeback,
      margin: revenue - rakeback,
    };
  });
}

/** Limits that survive a clean invariant run — stated so a number is never read
 *  as more certain than it is. */
function caveats(): string[] {
  return [
    "USDC fees are excluded from revenue: fee_ledger stores raw 6-decimal USDC in the same column as lamports, and no fill-time SOL/USD rate is recorded to convert with.",
    "Obligations are counted at accrual, not payout — margin already reflects money promised but not yet claimed.",
    "Network fees on payouts (~5000 lamports per confirmed claim) are not recorded anywhere, so real margin is marginally below the figure shown.",
    "The daily chart excludes referral commission: referral_earnings is an upsert aggregate with no per-event history, so a per-day split would be fiction.",
  ];
}

async function loadAccounting(): Promise<AccountingPayload> {
  const [totals, invariants, users, daily] = await Promise.all([
    loadTotals(),
    loadInvariants(),
    loadUserLedger(),
    loadDaily(),
  ]);

  return {
    totals,
    invariants,
    users,
    daily,
    ceilingPct: 72.25,
    floorPct: 50.05,
    caveats: caveats(),
    generatedAt: new Date().toISOString(),
  };
}

// 60s cache, matching the sibling trading dashboards. These are full-table
// aggregates over every money table and the numbers move on the timescale of
// trades, not seconds.
export const fetchAccounting = unstable_cache(loadAccounting, ["platform-accounting"], {
  revalidate: 60,
});
