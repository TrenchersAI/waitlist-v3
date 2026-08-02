"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { AccountingChart } from "@/src/app/analytics/accounting-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";

// =============================================================================
// Platform accounting — are we giving back more than we collect?
// =============================================================================
//
// Reading order is deliberate and the layout enforces it: TRUST first, then
// money. If the reconciliation invariants fail, every figure below them is
// derived from books that disagree with themselves, and showing a confident
// revenue number above a broken invariant would be actively misleading.

const LAMPORTS_PER_SOL = 1_000_000_000;

type Invariant = {
  name: string;
  label: string;
  ok: boolean;
  detail: string;
  consequence: string;
};

type UserRow = {
  userId: string;
  wallet: string | null;
  rank: string | null;
  feesInLamports: number;
  rakebackOwedLamports: number;
  referralCausedLamports: number;
  marginLamports: number;
  givebackPct: number | null;
};

type Payload = {
  totals: {
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
  invariants: Invariant[];
  users: UserRow[];
  daily: { date: string; revenue: number; rakeback: number; margin: number }[];
  ceilingPct: number;
  floorPct: number;
  caveats: string[];
  generatedAt: string;
};

function sol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/** SOL display. Small balances keep more precision — rounding a 0.0004 SOL
 *  figure to "0.00" makes a real number look like nothing. */
function fmtSol(n: number): string {
  const a = Math.abs(n);
  if (a >= 1000) return Math.round(n).toLocaleString("en-US");
  if (a >= 1) return n.toFixed(3);
  if (a === 0) return "0";
  // Below a microSOL there is no readable decimal form and scientific notation
  // makes a rounding artefact look like a measurement. Show the sign so a tiny
  // LOSS is still visibly a loss; `lamportsTitle` carries the exact figure.
  if (a < 0.000001) return n < 0 ? "≈0⁻" : "≈0";
  return n.toFixed(a < 0.001 ? 6 : 4);
}

/** Exact lamports for the `title` of any cell that had to round. */
function lamportsTitle(lamports: number): string {
  return `${lamports.toLocaleString("en-US")} lamports`;
}

function shortWallet(w: string | null): string {
  if (!w) return "—";
  return w.length > 12 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w;
}

export function AccountingContent() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Deliberately no setState in the effect body: `loading` starts true and
  // `error` null, and the retry handler resets both BEFORE bumping `reloadKey`,
  // so this effect only ever performs the fetch. Setting state here instead
  // would trigger the cascading-render path React warns about.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/accounting", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.message ?? `HTTP ${r.status}`);
        return body as Payload;
      })
      .then((p) => {
        if (!cancelled) setData(p);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const derived = useMemo(() => {
    if (!data) return null;
    const t = data.totals;
    const giveback = t.rakebackOwedLamports + t.referralOwedLamports;
    const givebackPct =
      t.revenueLamports > 0 ? (giveback / t.revenueLamports) * 100 : null;
    const failing = data.invariants.filter((i) => !i.ok);
    return {
      giveback,
      givebackPct,
      marginPct: givebackPct == null ? null : 100 - givebackPct,
      failing,
      trustworthy: failing.length === 0,
      // The worst individual margin, so a "1 user at a loss" headline can say
      // whether that loss is material or rounding-scale.
      worstUserMargin: data.users.length > 0 ? data.users[0].marginLamports : 0,
    };
  }, [data]);

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-10">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="size-4" aria-hidden />
            <p className="text-sm font-medium">Couldn&apos;t load accounting data</p>
          </div>
          <p className="max-w-prose text-xs text-white/50">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              setReloadKey((k) => k + 1);
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TrustPanel
        loading={loading}
        invariants={data?.invariants ?? []}
        trustworthy={derived?.trustworthy ?? false}
      />

      <HeadlineStats
        loading={loading}
        totals={data?.totals}
        givebackPct={derived?.givebackPct ?? null}
      />

      <GivebackBand
        loading={loading}
        givebackPct={derived?.givebackPct ?? null}
        floorPct={data?.floorPct ?? 50.05}
        ceilingPct={data?.ceilingPct ?? 72.25}
        referralOwed={data?.totals.referralOwedLamports ?? 0}
      />

      <DailyCard loading={loading} days={data?.daily ?? []} />

      <UserLedger
        loading={loading}
        users={data?.users ?? []}
        negativeCount={data?.totals.negativeMarginUsers ?? 0}
        worstMargin={derived?.worstUserMargin ?? 0}
      />

      <Caveats items={data?.caveats ?? []} generatedAt={data?.generatedAt} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trust — always first
// ---------------------------------------------------------------------------

function TrustPanel({
  loading,
  invariants,
  trustworthy,
}: {
  loading: boolean;
  invariants: Invariant[];
  trustworthy: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-5">
          <Skeleton className="h-5 w-64" />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const failing = invariants.filter((i) => !i.ok);

  return (
    <Card
      className={cn(
        trustworthy ? "border-white/10" : "border-rose-500/40 bg-rose-500/[0.03]",
      )}
    >
      <CardHeader>
        <div className="flex items-start gap-3">
          {trustworthy ? (
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-400" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-400" aria-hidden />
          )}
          <div>
            <CardTitle>
              {trustworthy
                ? "The books reconcile"
                : `${failing.length} reconciliation ${failing.length === 1 ? "check has" : "checks have"} failed`}
            </CardTitle>
            <CardDescription>
              {trustworthy
                ? "All six checks pass, so the figures below can be trusted. Each one is a real defect when it fails, not a warning."
                : "Every figure below is derived from books that disagree with themselves. Fix these before acting on any number on this page."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2">
          {invariants.map((inv) => (
            <li
              key={inv.name}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5",
                inv.ok
                  ? "border-white/8 bg-white/[0.02]"
                  : "border-rose-500/30 bg-rose-500/[0.06]",
              )}
            >
              {inv.ok ? (
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-emerald-400/80"
                  aria-hidden
                />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-rose-400" aria-hidden />
              )}
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[13px] font-medium",
                    inv.ok ? "text-white/85" : "text-white",
                  )}
                >
                  {inv.label}
                </p>
                <p className="mt-0.5 text-[11px] text-white/45">{inv.detail}</p>
                {!inv.ok ? (
                  <p className="mt-1 text-[11px] font-medium text-rose-300">
                    {inv.consequence}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Headline money
// ---------------------------------------------------------------------------

function HeadlineStats({
  loading,
  totals,
  givebackPct,
}: {
  loading: boolean;
  totals: Payload["totals"] | undefined;
  givebackPct: number | null;
}) {
  const marginNegative = (totals?.marginLamports ?? 0) < 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        label="Fees collected"
        value={totals ? fmtSol(sol(totals.revenueLamports)) : "—"}
        sub={totals ? `${totals.feeEvents.toLocaleString()} fills · ${totals.usersWithRevenue} traders` : undefined}
        loading={loading}
        accent
      />
      <Stat
        label="Rakeback owed"
        value={totals ? fmtSol(sol(totals.rakebackOwedLamports)) : "—"}
        sub={
          totals
            ? `${fmtSol(sol(totals.rakebackPaidLamports))} ◎ already claimed`
            : undefined
        }
        dotColor="#fb923c"
        loading={loading}
      />
      <Stat
        label="Referral owed"
        value={totals ? fmtSol(sol(totals.referralOwedLamports)) : "—"}
        sub={
          totals && totals.revenueLamports > 0
            ? `${((totals.referralOwedLamports / totals.revenueLamports) * 100).toFixed(3)}% of revenue`
            : undefined
        }
        dotColor="#818cf8"
        loading={loading}
      />
      <Stat
        label="Margin"
        value={totals ? fmtSol(sol(totals.marginLamports)) : "—"}
        sub={givebackPct != null ? `${(100 - givebackPct).toFixed(1)}% retained` : undefined}
        loading={loading}
        tone={marginNegative ? "bad" : "good"}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
  dotColor,
  tone,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  dotColor?: string;
  tone?: "good" | "bad";
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-xs text-white/50">
        {dotColor ? (
          <span
            className="size-2 rounded-sm"
            style={{ background: dotColor }}
            aria-hidden
          />
        ) : null}
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-1.5 h-6 w-24" />
      ) : (
        <div className="mt-1 flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-xl font-semibold tabular-nums",
              tone === "bad"
                ? "text-rose-400"
                : tone === "good"
                  ? "text-emerald-400"
                  : accent
                    ? "text-white"
                    : "text-white/85",
            )}
          >
            {value}
          </span>
          <span className="text-[10px] font-normal text-white/40">◎</span>
        </div>
      )}
      {sub && !loading ? (
        <div className="mt-0.5 truncate text-[11px] text-white/35" title={sub}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Giveback vs the design band
// ---------------------------------------------------------------------------

/**
 * The tier ladder bounds giveback between 50.05% (Bronze) and 72.25% (Titan),
 * because referral is commissioned on the fee NET of rakeback. Showing the
 * actual figure against that band turns an abstract percentage into a
 * judgement: inside the band is working as designed, above it means the netting
 * is being bypassed, below it means the ladder is not being used.
 */
function GivebackBand({
  loading,
  givebackPct,
  floorPct,
  ceilingPct,
  referralOwed,
}: {
  loading: boolean;
  givebackPct: number | null;
  floorPct: number;
  ceilingPct: number;
  referralOwed: number;
}) {
  const SCALE = 100;
  const pos = givebackPct == null ? null : Math.min(Math.max(givebackPct, 0), SCALE);

  const verdict =
    givebackPct == null
      ? null
      : givebackPct > ceilingPct
        ? {
            tone: "bad" as const,
            title: "Above the design ceiling",
            body: "Giveback exceeds what the tier ladder can produce even at Titan with a full referral chain, so something is bypassing the netting.",
          }
        : givebackPct < floorPct
          ? {
              tone: "info" as const,
              title: "Below the design floor",
              body:
                referralOwed < 1_000_000
                  ? "Referral commission is effectively unused, so giveback is rakeback alone. The ladder is working; the referral programme simply is not being taken up."
                  : "Giveback is below the Bronze floor, which usually means most volume sits at the lowest tier.",
            }
          : {
              tone: "good" as const,
              title: "Inside the design band",
              body: "Giveback sits where the tier ladder intends, between the Bronze floor and the Titan ceiling.",
            };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Giveback vs the design band</CardTitle>
        <CardDescription>
          Rakeback and referral are both shares of the same fee, and referral is
          commissioned on the fee net of rakeback. That bounds total giveback
          between {floorPct}% (Bronze) and {ceilingPct}% (Titan) by design.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <div className="relative h-11">
              {/* track */}
              <div className="absolute inset-x-0 top-4 h-2.5 rounded-full bg-white/[0.05]" />
              {/* design band */}
              <div
                className="absolute top-4 h-2.5 rounded-full bg-emerald-400/25"
                style={{
                  left: `${floorPct}%`,
                  width: `${ceilingPct - floorPct}%`,
                }}
                aria-hidden
              />
              {/* actual marker */}
              {pos != null ? (
                <div
                  className="absolute top-0"
                  style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
                >
                  <div className="flex flex-col items-center">
                    <span className="whitespace-nowrap text-[11px] font-semibold text-white tabular-nums">
                      {givebackPct?.toFixed(1)}%
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 h-4 w-0.5 rounded-full",
                        verdict?.tone === "bad" ? "bg-rose-400" : "bg-white",
                      )}
                      aria-hidden
                    />
                  </div>
                </div>
              ) : null}
              <div className="absolute inset-x-0 top-8 flex justify-between text-[10px] text-white/30">
                <span>0%</span>
                <span>100%</span>
              </div>
              <span
                className="absolute top-7 text-[10px] text-emerald-400/60"
                style={{ left: `${floorPct}%`, transform: "translateX(-50%)" }}
              >
                {floorPct}%
              </span>
              <span
                className="absolute top-7 text-[10px] text-emerald-400/60"
                style={{ left: `${ceilingPct}%`, transform: "translateX(-50%)" }}
              >
                {ceilingPct}%
              </span>
            </div>

            {verdict ? (
              <div
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border px-3 py-2.5",
                  verdict.tone === "bad"
                    ? "border-rose-500/30 bg-rose-500/[0.06]"
                    : verdict.tone === "good"
                      ? "border-emerald-500/25 bg-emerald-500/[0.04]"
                      : "border-white/10 bg-white/[0.02]",
                )}
              >
                <Info
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    verdict.tone === "bad"
                      ? "text-rose-400"
                      : verdict.tone === "good"
                        ? "text-emerald-400"
                        : "text-white/50",
                  )}
                  aria-hidden
                />
                <div>
                  <p className="text-[13px] font-medium text-white/90">
                    {verdict.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/50">{verdict.body}</p>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Daily
// ---------------------------------------------------------------------------

function DailyCard({
  loading,
  days,
}: {
  loading: boolean;
  days: { date: string; revenue: number; rakeback: number; margin: number }[];
}) {
  // A day where accrual outruns collection is almost always a backfill, not a
  // loss — accruals get booked on the day the job ran, against fees collected
  // earlier. Saying so inline stops a one-off spike reading as a crisis.
  const backfillDays = days.filter((d) => d.rakeback > d.revenue);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collected vs accrued, by day</CardTitle>
        <CardDescription>
          Platform fees collected each day against the rakeback accrued against
          them. The gap between the bars is the day&apos;s margin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : days.length === 0 ? (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-white/70">No fee data yet</p>
            <p className="max-w-sm text-xs text-white/40">
              Once trades start settling, daily collected and accrued figures
              appear here. If you expected data, check that
              TRENCHERS_DATABASE_URL is set.
            </p>
          </div>
        ) : (
          <>
            <AccountingChart days={days} />
            {backfillDays.length > 0 ? (
              <p className="flex items-start gap-2 text-[11px] text-white/45">
                <Info className="mt-0.5 size-3.5 shrink-0 text-orange-400/70" aria-hidden />
                <span>
                  {backfillDays.length === 1
                    ? `${backfillDays[0].date} shows`
                    : `${backfillDays.length} days show`}{" "}
                  more rakeback accrued than collected. That is the accrual
                  backfill booking historical fees on the day it ran, not a loss
                  on that day&apos;s trading — the all-time margin above is the
                  figure that matters.
                </span>
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Per-user ledger
// ---------------------------------------------------------------------------

function UserLedger({
  loading,
  users,
  negativeCount,
  worstMargin,
}: {
  loading: boolean;
  users: UserRow[];
  negativeCount: number;
  worstMargin: number;
}) {
  // "1 user at a loss" reads as alarming until you see the loss is 2 lamports.
  // Rounding-scale losses are an artefact of integer division in the accrual
  // maths, not money going out the door.
  const trivial = negativeCount > 0 && Math.abs(worstMargin) < 100_000;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Per-user ledger</CardTitle>
            <CardDescription>
              Worst margin first. A user&apos;s cost is their own rakeback plus
              the commission their trading obliges us to pay upline.
            </CardDescription>
          </div>
          {!loading ? (
            <span
              className={cn(
                "shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium",
                negativeCount === 0
                  ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300"
                  : trivial
                    ? "border-white/10 bg-white/[0.03] text-white/60"
                    : "border-rose-500/30 bg-rose-500/[0.06] text-rose-300",
              )}
            >
              {negativeCount === 0
                ? "No users at a loss"
                : `${negativeCount} at a loss${trivial ? " (rounding-scale)" : ""}`}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="text-sm font-medium text-white/70">No user activity yet</p>
            <p className="max-w-sm text-xs text-white/40">
              Users appear here once they generate a fee or accrue rakeback.
            </p>
          </div>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-white/8 text-left text-[11px] font-medium text-white/45">
                  <th scope="col" className="pb-2 pr-3 font-medium">Wallet</th>
                  <th scope="col" className="pb-2 pr-3 font-medium">Tier</th>
                  <th scope="col" className="pb-2 pr-3 text-right font-medium">Fees in</th>
                  <th scope="col" className="pb-2 pr-3 text-right font-medium">Rakeback</th>
                  <th scope="col" className="pb-2 pr-3 text-right font-medium">Referral</th>
                  <th scope="col" className="pb-2 pr-3 text-right font-medium">Margin</th>
                  <th scope="col" className="pb-2 text-right font-medium">Giveback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => {
                  const negative = u.marginLamports < 0;
                  return (
                    <tr key={u.userId} className="transition-colors hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-3 font-mono text-[12px] text-white/70">
                        {shortWallet(u.wallet)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] capitalize text-white/60">
                          {u.rank ?? "—"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-white/80">
                        {fmtSol(sol(u.feesInLamports))}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-white/60">
                        {fmtSol(sol(u.rakebackOwedLamports))}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-white/60">
                        {u.referralCausedLamports > 0
                          ? fmtSol(sol(u.referralCausedLamports))
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 pr-3 text-right font-medium tabular-nums",
                          negative ? "text-rose-400" : "text-white/85",
                        )}
                        title={lamportsTitle(u.marginLamports)}
                      >
                        {fmtSol(sol(u.marginLamports))}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-white/50">
                        {u.givebackPct == null ? "—" : `${u.givebackPct.toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Caveats
// ---------------------------------------------------------------------------

function Caveats({
  items,
  generatedAt,
}: {
  items: string[];
  generatedAt?: string;
}) {
  if (items.length === 0) return null;
  return (
    <Card className="border-white/8 bg-white/[0.01]">
      <CardHeader>
        <CardTitle className="text-[13px] font-medium text-white/70">
          What these numbers cannot tell you
        </CardTitle>
        <CardDescription className="text-[11px]">
          Known limits that apply even when every reconciliation check passes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c} className="flex items-start gap-2 text-[11px] text-white/45">
              <span
                className="mt-1.5 size-1 shrink-0 rounded-full bg-white/25"
                aria-hidden
              />
              <span>{c}</span>
            </li>
          ))}
        </ul>
        {generatedAt ? (
          <p className="mt-4 border-t border-white/5 pt-3 text-[10px] text-white/25">
            Computed {new Date(generatedAt).toUTCString()} · cached for 60s
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
