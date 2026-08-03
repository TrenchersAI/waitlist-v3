"use client";

// =============================================================================
// Live pulse - the one screen a founder or marketer can open and know where the
// business stands.
//
// Everything here is read from the trenchers prod DB with no cache, and the
// view re-polls on an interval so the numbers move on their own. The header
// carries a live dot plus the age of the data, because a dashboard that
// silently goes stale is worse than one that admits it.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import type { PulsePayload } from "@/src/lib/trenchers-pulse";
import { cn } from "@/src/lib/utils";

/** How often the page re-polls. Matches the cadence of the trading charts. */
const POLL_MS = 30_000;

// -----------------------------------------------------------------------------
// Formatting. SOL formatting is matched to the trading dashboards so the same
// quantity never renders two ways across sections.
// -----------------------------------------------------------------------------

function fmtSol(n: number): string {
  const a = Math.abs(n);
  if (a >= 100_000) return `${(n / 1000).toFixed(0)}k`;
  if (a >= 1000) return Math.round(n).toLocaleString("en-US");
  if (a >= 1) return n.toFixed(2);
  if (a === 0) return "0";
  return n.toFixed(a < 0.001 ? 5 : 3);
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function fmtPct(n: number | null, digits = 1): string {
  if (n === null || !Number.isFinite(n)) return "n/a";
  return `${n.toFixed(digits)}%`;
}

/** A ratio in 0..1 rendered as a percent. */
function fmtRatioPct(n: number | null, digits = 1): string {
  if (n === null || !Number.isFinite(n)) return "n/a";
  return `${(n * 100).toFixed(digits)}%`;
}

function fmtSigned(n: number): string {
  return `${n > 0 ? "+" : ""}${fmtSol(n)}`;
}

function fmtAge(iso: string | null): string {
  if (!iso) return "never";
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(secs) || secs < 0) return "just now";
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// -----------------------------------------------------------------------------

export function PulseAnalyticsContent() {
  const [data, setData] = useState<PulsePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  // Re-render on a timer purely so the "updated Ns ago" label counts up between
  // polls. Kept separate from `data` so it never triggers a refetch.
  const [, setTick] = useState(0);

  // Guards against overlapping polls: a slow query must not stack up requests
  // against the prod DB behind a 30s timer.
  const inFlight = useRef(false);

  // Deliberately setState-free, so it can be called straight from an effect
  // body without tripping react-hooks/set-state-in-effect. State is applied by
  // the callers, inside promise callbacks.
  const fetchPulse = useCallback(async (): Promise<PulsePayload> => {
    const r = await fetch("/api/analytics/pulse", { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as PulsePayload;
  }, []);

  const apply = useCallback((d: PulsePayload) => {
    setData(d);
    setError(null);
    setLoading(false);
  }, []);

  const fail = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : "Failed to load");
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    inFlight.current = true;
    fetchPulse()
      .then((d) => {
        if (!cancelled) apply(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) fail(e);
      })
      .finally(() => {
        inFlight.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPulse, apply, fail, nonce]);

  // Auto-refresh. Paused while the tab is hidden: polling a background tab
  // burns prod DB round-trips for a screen nobody is looking at.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (inFlight.current) return;
      inFlight.current = true;
      fetchPulse()
        .then(apply)
        .catch(fail)
        .finally(() => {
          inFlight.current = false;
        });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [fetchPulse, apply, fail]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (loading && !data) return <LoadingState />;

  if (error && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live pulse</CardTitle>
          <CardDescription className="text-red-400/80">
            Could not load platform pulse: {error}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (data && !data.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live pulse</CardTitle>
          <CardDescription>
            <code className="text-white/70">TRENCHERS_DATABASE_URL</code> is not
            set, so there is no connection to the trading database. Set it in
            Vercel and in <code className="text-white/70">.env</code>. Showing
            nothing rather than zeros, which would read as a dead platform.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const d = data!;
  const { growth, funnel, engagement, money, revenue, bots, execution, adoption } =
    d;

  return (
    <div className="flex flex-col gap-6">
      {/* header ------------------------------------------------------------ */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Live pulse</h2>
          <p className="text-sm text-white/50">
            Every metric below is read live from the trading database on each
            poll. Nothing here is cached.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] text-white/40">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Live, updated {fmtAge(d.generatedAt)}
          </span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setNonce((n) => n + 1);
            }}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-300/80">
          Last refresh failed ({error}). Showing the previous good read from{" "}
          {fmtAge(d.generatedAt)}.
        </p>
      ) : null}

      {/* headline ---------------------------------------------------------- */}
      <Section
        title="Headline"
        hint="The five numbers to check first thing in the morning."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat
            label="Total users"
            value={fmtInt(growth.totalUsers)}
            sub={`${fmtInt(growth.newToday)} today, ${fmtInt(growth.new7d)} this week`}
          />
          <Stat
            label="Trading (24h)"
            value={fmtInt(engagement.dau)}
            sub={`${fmtInt(engagement.wau)} this week, ${fmtInt(engagement.mau)} this month`}
            tone={engagement.dau > 0 ? "good" : "warn"}
          />
          <Stat
            label="Net deposited"
            value={`${fmtSol(money.netDepositedSol)} SOL`}
            sub={`${fmtInt(money.depositorCount)} depositors, ${fmtSol(money.deposited24hSol)} in 24h`}
          />
          <Stat
            label="Revenue"
            value={`${fmtSol(revenue.feeSol)} SOL`}
            sub={`${fmtSol(revenue.fee24hSol)} in 24h, ${fmtSol(revenue.fee7dSol)} in 7d`}
            tone="good"
          />
          <Stat
            label="Bot PnL (realized)"
            value={`${fmtSigned(bots.realizedPnlSol)} SOL`}
            sub={`${fmtRatioPct(bots.winRate)} of sell legs profitable`}
            tone={
              bots.realizedPnlSol > 0
                ? "good"
                : bots.realizedPnlSol < 0
                  ? "bad"
                  : "plain"
            }
          />
        </div>
      </Section>

      {/* funnel ------------------------------------------------------------ */}
      <Section
        title="Activation funnel"
        hint="Where users fall out, all time. Each bar is a share of everyone who signed up; the percentage on the right is conversion from the step above."
      >
        <Card>
          <CardContent className="flex flex-col gap-2.5 p-4">
            {funnel.map((step, i) => (
              <div key={step.key} className="flex items-center gap-3">
                <div className="w-40 shrink-0">
                  <p className="text-xs font-medium text-white">{step.label}</p>
                  <p className="text-[10px] text-white/35">{step.hint}</p>
                </div>
                <div className="relative h-7 flex-1 overflow-hidden rounded bg-white/[0.04]">
                  <div
                    className="h-full rounded bg-indigo-500/70"
                    style={{ width: `${Math.min(100, step.pctOfTop)}%` }}
                  />
                  <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-semibold tabular-nums text-white">
                    {fmtInt(step.users)}
                  </span>
                </div>
                <div className="w-24 shrink-0 text-right">
                  <p className="text-xs font-semibold tabular-nums text-white">
                    {fmtPct(step.pctOfTop)}
                  </p>
                  {i > 0 ? (
                    <p
                      className={cn(
                        "text-[10px] tabular-nums",
                        step.pctOfPrev < 50 ? "text-amber-400/80" : "text-white/35",
                      )}
                    >
                      {fmtPct(step.pctOfPrev, 0)} of prev
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </Section>

      {/* growth ------------------------------------------------------------ */}
      <Section title="Growth" hint="Signups and account state.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="New this week"
            value={fmtInt(growth.new7d)}
            sub={
              growth.wowPct === null
                ? "no prior week to compare"
                : `${growth.wowPct >= 0 ? "+" : ""}${growth.wowPct.toFixed(0)}% vs prior week`
            }
            tone={
              growth.wowPct === null
                ? "plain"
                : growth.wowPct >= 0
                  ? "good"
                  : "bad"
            }
          />
          <Stat
            label="New this month"
            value={fmtInt(growth.new30d)}
            sub={`${fmtInt(growth.newToday)} today`}
          />
          <Stat
            label="Onboarded"
            value={fmtInt(growth.onboardedUsers)}
            sub={`${fmtPct((growth.onboardedUsers / Math.max(1, growth.totalUsers)) * 100)} of all users`}
          />
          <Stat
            label="Live trading enabled"
            value={fmtInt(growth.liveTradingEnabled)}
            sub={`${fmtInt(adoption.whitelistEnabled)} on the beta whitelist`}
          />
        </div>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-white/40">
              Signups, last 30 days
            </p>
            <Sparkline
              values={growth.signupsByDay.map((s) => s.count)}
              labels={growth.signupsByDay.map((s) => s.date)}
            />
          </CardContent>
        </Card>
      </Section>

      {/* engagement -------------------------------------------------------- */}
      <Section
        title="Engagement"
        hint="A user counts as active on a day when they land a confirmed on-chain fill, from either the bot engine or a manual swap."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Stickiness"
            value={fmtRatioPct(engagement.stickiness, 0)}
            sub="DAU / MAU"
            tone={
              engagement.stickiness !== null && engagement.stickiness >= 0.2
                ? "good"
                : "plain"
            }
          />
          <Stat
            label="Repeat traders"
            value={fmtInt(engagement.repeatTraders)}
            sub="Traded on 2+ days in the last 30"
          />
          <Stat
            label="New traders (7d)"
            value={fmtInt(engagement.newTraders7d)}
            sub="First ever fill this week"
            tone={engagement.newTraders7d > 0 ? "good" : "plain"}
          />
          <Stat
            label="Churned (7d)"
            value={fmtInt(engagement.churned7d)}
            sub="Traded the week before, silent since"
            tone={engagement.churned7d > 0 ? "warn" : "plain"}
          />
        </div>
      </Section>

      {/* money ------------------------------------------------------------- */}
      <Section
        title="Money"
        hint="Deposits and withdrawals are measured from System-transfer legs only, so trading and fee movement never leaks into these totals."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Gross deposited"
            value={`${fmtSol(money.depositedSol)} SOL`}
            sub={`${fmtSol(money.deposited7dSol)} in the last 7d`}
          />
          <Stat
            label="Withdrawn"
            value={`${fmtSol(money.withdrawnSol)} SOL`}
            sub={`${fmtRatioPct(money.withdrawalRatio, 0)} of deposits pulled back out`}
            tone={
              money.withdrawalRatio !== null && money.withdrawalRatio > 0.8
                ? "warn"
                : "plain"
            }
          />
          <Stat
            label="Custodied now"
            value={`${fmtSol(money.walletBalanceSol + money.botBalanceSol)} SOL`}
            sub={`${fmtSol(money.botBalanceSol)} SOL sitting in bot wallets`}
          />
          <Stat
            label="Median depositor"
            value={`${fmtSol(money.medianNetSol)} SOL`}
            sub={`p90 is ${fmtSol(money.p90NetSol)} SOL net`}
          />
        </div>
      </Section>

      {/* revenue ----------------------------------------------------------- */}
      <Section
        title="Revenue"
        hint="Fees actually recorded in the ledger, paper excluded per trade. Take rate is fees over the volume that produced them."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Fees all time"
            value={`${fmtSol(revenue.feeSol)} SOL`}
            sub={`across ${fmtSol(revenue.volumeSol)} SOL of volume`}
            tone="good"
          />
          <Stat
            label="Take rate"
            value={
              revenue.takeRateBps === null
                ? "n/a"
                : `${revenue.takeRateBps.toFixed(1)} bps`
            }
            sub="Realized, not configured"
          />
          <Stat
            label="Revenue per trader"
            value={
              revenue.arpuSol === null ? "n/a" : `${fmtSol(revenue.arpuSol)} SOL`
            }
            sub="Lifetime fees / users who ever traded"
          />
          <Stat
            label="Fees this week"
            value={`${fmtSol(revenue.fee7dSol)} SOL`}
            sub={`${fmtSol(revenue.fee24hSol)} SOL in the last 24h`}
          />
        </div>
        {revenue.byKind.length > 0 ? (
          <BreakdownCard
            title="Fees by source"
            rows={revenue.byKind.map((k) => ({
              label: k.kind,
              value: `${fmtSol(k.sol)} SOL`,
              weight: k.sol,
            }))}
          />
        ) : null}
      </Section>

      {/* bots -------------------------------------------------------------- */}
      <Section
        title="Bots"
        hint="Realized PnL is the sum of pnl_lamports on confirmed live sell legs. Open positions are cost basis, not marked to market."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Live bots"
            value={fmtInt(bots.liveBots)}
            sub={`${fmtInt(bots.activeLiveBots)} active right now`}
          />
          <Stat
            label="Paper bots"
            value={fmtInt(bots.paperBots)}
            sub={`${fmtPct(bots.paperToLivePct, 0)} of paper users went live`}
          />
          <Stat
            label="Profitable bots"
            value={`${fmtInt(bots.profitableBots)} / ${fmtInt(bots.profitableBots + bots.unprofitableBots)}`}
            sub={`${fmtInt(bots.unprofitableBots)} underwater`}
            tone={
              bots.profitableBots > bots.unprofitableBots ? "good" : "warn"
            }
          />
          <Stat
            label="Open exposure"
            value={`${fmtSol(bots.openCostSol)} SOL`}
            sub={`${fmtInt(bots.openPositions)} open live positions`}
          />
        </div>
        {bots.byState.length > 0 ? (
          <BreakdownCard
            title="Bots by lifecycle state"
            rows={bots.byState.map((s) => ({
              label: s.state,
              value: `${fmtInt(s.live)} live, ${fmtInt(s.paper)} paper`,
              weight: s.live + s.paper,
            }))}
          />
        ) : null}
      </Section>

      {/* execution --------------------------------------------------------- */}
      <Section
        title="Execution quality"
        hint="What it costs us to land a trade, and how often we do. Fees paid are the last 7 days."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Confirm rate (24h)"
            value={fmtRatioPct(execution.confirmRate, 0)}
            sub={`${fmtInt(execution.confirmed24h)} landed, ${fmtInt(execution.failed24h)} failed`}
            tone={
              execution.confirmRate !== null && execution.confirmRate < 0.7
                ? "warn"
                : "good"
            }
          />
          <Stat
            label="Priority fees (7d)"
            value={`${fmtSol(execution.priorityFee7dSol)} SOL`}
            sub={`${fmtSol(execution.priorityCapture7dSol)} SOL recaptured`}
          />
          <Stat
            label="Jito tips (7d)"
            value={`${fmtSol(execution.jitoTip7dSol)} SOL`}
            sub="Paid to land bundles"
          />
          <Stat
            label="Net execution cost (7d)"
            value={`${fmtSol(execution.priorityFee7dSol + execution.jitoTip7dSol - execution.priorityCapture7dSol)} SOL`}
            sub="Fees + tips, less what we recaptured"
            tone="warn"
          />
        </div>
        {execution.landerMix.length > 0 ? (
          <BreakdownCard
            title="Which lander won, last 7 days"
            rows={execution.landerMix.map((l) => ({
              label: l.lander,
              value: fmtInt(l.count),
              weight: l.count,
            }))}
          />
        ) : null}
      </Section>

      {/* adoption ---------------------------------------------------------- */}
      <Section
        title="Feature adoption"
        hint="Distinct users who have ever touched each surface, as a share of all signups. This is the list to read before deciding what to market."
      >
        <BreakdownCard
          title="Surfaces"
          rows={adoption.items.map((it) => ({
            label: it.label,
            value: `${fmtInt(it.users)} (${fmtPct(it.pct, 0)})`,
            weight: it.users,
          }))}
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Referred users"
            value={fmtInt(adoption.referredUsers)}
            sub={`${fmtPct(adoption.referralPct, 0)} of signups came via a referral`}
          />
          <Stat
            label="Users with points"
            value={fmtInt(adoption.pointsUsers)}
            sub={`${fmtInt(adoption.totalGold)} gold awarded in total`}
          />
          <Stat
            label="Quest awards"
            value={fmtInt(adoption.questAwards)}
            sub="Quests completed across all users"
          />
          <Stat
            label="Beta whitelist"
            value={fmtInt(adoption.whitelistEnabled)}
            sub="Enabled entries in login_whitelist"
          />
        </div>
      </Section>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Pieces
// -----------------------------------------------------------------------------

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <Activity className="size-3.5 text-white/30" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {hint ? <p className="-mt-2 text-xs text-white/40">{hint}</p> : null}
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "plain",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "plain" | "good" | "bad" | "warn";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-white/40">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums",
            tone === "good"
              ? "text-emerald-400"
              : tone === "bad"
                ? "text-red-400"
                : tone === "warn"
                  ? "text-amber-400"
                  : "text-white",
          )}
        >
          {value}
        </p>
        {sub ? <p className="mt-1 text-[11px] text-white/40">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

/** A labelled proportional bar list. Weights are normalised to the largest row,
 *  so a single dominant row does not squash the rest into invisibility. */
function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; weight: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.weight)));
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <p className="text-[10px] uppercase tracking-wider text-white/40">
          {title}
        </p>
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-xs capitalize text-white/70">
              {r.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full bg-indigo-500/60"
                style={{ width: `${(Math.abs(r.weight) / max) * 100}%` }}
              />
            </div>
            <span className="w-36 shrink-0 text-right text-xs tabular-nums text-white/60">
              {r.value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Minimal inline bar sparkline. Deliberately not a charting library: this is
 *  one series of small integers and the existing charts already own the heavy
 *  visualisation surface. */
function Sparkline({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  const max = useMemo(() => Math.max(1, ...values), [values]);
  const total = useMemo(() => values.reduce((s, v) => s + v, 0), [values]);
  return (
    <div className="mt-2">
      <div className="flex h-16 items-end gap-[3px]">
        {values.map((v, i) => (
          <div
            key={labels[i]}
            title={`${labels[i]}: ${v}`}
            className={cn(
              "flex-1 rounded-sm transition-colors",
              v > 0 ? "bg-indigo-500/70 hover:bg-indigo-400" : "bg-white/[0.06]",
            )}
            style={{ height: `${Math.max(3, (v / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-white/30">
        <span>{labels[0]}</span>
        <span>{fmtInt(total)} in 30 days</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
