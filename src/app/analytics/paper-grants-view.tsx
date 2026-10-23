"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  HandCoins,
  Percent,
  Repeat2,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  TradingBarChart,
  type ChartView,
  type TradingDay,
} from "@/src/app/analytics/trading-bar-chart";
import {
  AUTO_COLOR,
  OPERATOR_COLOR,
  PaperGrantsPanel,
} from "@/src/app/analytics/paper-grants-panel";
import {
  RANGES,
  StatCard,
  ViewToggle,
  fmtSol,
  type RangeKey,
} from "@/src/app/analytics/trading-analytics-view";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";

// One day of paper SOL hand-outs, mirrored from `trenchers-paper-grants.ts`.
type GrantDay = {
  date: string; // YYYY-MM-DD (UTC)
  total: number;
  auto: number;
  operator: number;
  grants: number;
  users: number;
  rejected: number;
  requested: number;
};

type GrantsPayload = {
  floor: string;
  days: GrantDay[];
  pending: { count: number; sol: number };
};

// The stacked chart is bot/manual-shaped; here the two segments are the two
// approval paths — auto-approved first requests (indigo, bottom) and
// operator-approved top-ups (teal, top).
function toChartDay(d: GrantDay): TradingDay {
  return { date: d.date, total: d.total, bot: d.auto, manual: d.operator };
}

function sumKey(
  days: GrantDay[],
  key: "total" | "auto" | "operator" | "grants" | "users" | "rejected" | "requested",
): number {
  return days.reduce((acc, d) => acc + d[key], 0);
}

function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

/** The Paper SOL given dashboard — the hand-out twin of Paper volume. Same
 *  layout (headline cards, range pills, stacked daily/cumulative chart, click a
 *  bar for that day's recipients), fed by approved paper top-ups from the ops
 *  console. */
export function PaperGrantsContent() {
  const [data, setData] = useState<GrantsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("all");
  const [view, setView] = useState<ChartView>("daily");
  // Per-day drill-down: click a bar to list who received paper SOL that day.
  const [pickedDay, setPickedDay] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // `loading` starts true and `error` null, so no synchronous setState here
    // (fetch runs once on mount; deps are empty).
    fetch("/api/analytics/paper-grants", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as GrantsPayload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
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
  }, []);

  const allDays = useMemo(() => data?.days ?? [], [data]);

  const rangeDays = RANGES.find((r) => r.key === range)?.days ?? null;
  const days = useMemo(
    () => (rangeDays ? allDays.slice(-rangeDays) : allDays),
    [allDays, rangeDays],
  );
  const chartDays = useMemo(() => days.map(toChartDay), [days]);

  const totals = useMemo(
    () => ({
      total: sumKey(days, "total"),
      auto: sumKey(days, "auto"),
      operator: sumKey(days, "operator"),
      grants: sumKey(days, "grants"),
      users: sumKey(days, "users"),
      rejected: sumKey(days, "rejected"),
      requested: sumKey(days, "requested"),
    }),
    [days],
  );

  // Extra headline stats: average per active day, best day, and the trend vs
  // the immediately-preceding window of equal length.
  const derived = useMemo(() => {
    const activeDays = days.filter((d) => d.total > 0).length;
    const avg = activeDays > 0 ? totals.total / activeDays : 0;
    const peak = days.reduce<GrantDay | null>(
      (best, d) => (best == null || d.total > best.total ? d : best),
      null,
    );
    let trendPct: number | null = null;
    if (rangeDays && allDays.length >= rangeDays * 2) {
      const prev = allDays.slice(-rangeDays * 2, -rangeDays);
      const prevSum = sumKey(prev, "total");
      if (prevSum > 0) trendPct = ((totals.total - prevSum) / prevSum) * 100;
    }
    const decided = totals.grants + totals.rejected;
    const approvalRate = decided > 0 ? (totals.grants / decided) * 100 : null;
    const avgPerGrant = totals.grants > 0 ? totals.total / totals.grants : 0;
    return { avg, peak, trendPct, approvalRate, avgPerGrant };
  }, [days, totals, rangeDays, allDays]);

  const autoPct =
    totals.total > 0 ? Math.round((totals.auto / totals.total) * 100) : 0;
  const operatorPct = totals.total > 0 ? 100 - autoPct : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Paper SOL given</CardTitle>
            <CardDescription>
              Paper SOL handed to users per day since Aug 18 — each bar is the
              day&apos;s approved &ldquo;Request sol&rdquo; top-ups, stacked into
              auto-approved first requests and operator-approved ones. The
              default starting seed is not a hand-out and is excluded.
            </CardDescription>
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* headline stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total paper SOL given"
            value={fmtSol(totals.total)}
            loading={loading}
            accent
            trendPct={derived.trendPct}
          />
          <StatCard
            label="Auto-approved"
            value={fmtSol(totals.auto)}
            sub={`${autoPct}% of total · first requests`}
            dotColor={AUTO_COLOR}
            loading={loading}
          />
          <StatCard
            label="Operator-approved"
            value={fmtSol(totals.operator)}
            sub={`${operatorPct}% of total · repeat top-ups`}
            dotColor={OPERATOR_COLOR}
            loading={loading}
          />
          <StatCard
            label="Avg / active day"
            value={fmtSol(derived.avg)}
            sub={
              derived.peak && derived.peak.total > 0
                ? `Peak ${fmtSol(derived.peak.total)} on ${derived.peak.date.slice(5)}`
                : undefined
            }
            loading={loading}
          />
        </div>

        {/* secondary strip: the counts behind the SOL */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <MiniStat
            icon={HandCoins}
            label="Grants"
            value={fmtInt(totals.grants)}
            sub={
              totals.grants > 0
                ? `◎${fmtSol(derived.avgPerGrant)} avg each`
                : undefined
            }
            loading={loading}
          />
          <MiniStat
            icon={Users}
            label="Recipient-days"
            value={fmtInt(totals.users)}
            sub="distinct users per day, summed"
            loading={loading}
          />
          <MiniStat
            icon={Repeat2}
            label="Requests"
            value={fmtInt(totals.requested)}
            sub={
              totals.rejected > 0
                ? `${fmtInt(totals.rejected)} rejected`
                : "none rejected"
            }
            loading={loading}
          />
          <MiniStat
            icon={Percent}
            label="Approval rate"
            value={
              derived.approvalRate == null
                ? "—"
                : `${Math.round(derived.approvalRate)}%`
            }
            sub="approved ÷ decided"
            loading={loading}
          />
          <MiniStat
            icon={Clock3}
            label="Pending now"
            value={fmtInt(data?.pending.count ?? 0)}
            sub={
              data && data.pending.count > 0
                ? `◎${fmtSol(data.pending.sol)} waiting for review`
                : "queue is clear"
            }
            loading={loading}
            attention={Boolean(data && data.pending.count > 0)}
          />
        </div>

        {/* range pills */}
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  range === r.key
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/80",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          {!loading && days.length > 0 ? (
            <span className="hidden text-[11px] text-white/35 sm:inline">
              {days[0].date} → {days[days.length - 1].date}
            </span>
          ) : null}
        </div>

        {/* chart */}
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : error ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-white/40">
            Couldn&apos;t load paper SOL data ({error}).
          </div>
        ) : allDays.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-white/40">
            No paper SOL data yet (or OPS_ANALYTICS_TOKEN is unset).
          </div>
        ) : (
          <TradingBarChart
            days={chartDays}
            view={view}
            unit="SOL"
            botLegend="Auto-approved"
            manualLegend="Operator-approved"
            onPickDay={setPickedDay}
            pickedDate={pickedDay}
          />
        )}

        {/* Per-day drill-down: click a bar → who received paper SOL that day. */}
        {pickedDay ? (
          <PaperGrantsPanel
            date={pickedDay}
            onClose={() => setPickedDay(null)}
          />
        ) : !loading && allDays.length > 0 ? (
          <p className="text-center text-[11px] text-white/30">
            Tip: click any <span className="text-white/50">bar</span> to see
            which users received paper SOL that day, how much, and who
            approved it.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** A compact count tile for the secondary strip — same surface as StatCard,
 *  smaller type, with an icon so the row scans as "the numbers behind the
 *  SOL" rather than a second set of headline figures. */
function MiniStat({
  icon: Icon,
  label,
  value,
  sub,
  loading,
  attention,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  loading: boolean;
  /** Softly highlight (e.g. a non-empty review queue). */
  attention?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        attention
          ? "border-amber-300/25 bg-amber-300/[0.05]"
          : "border-white/10 bg-white/[0.02]",
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-white/50">
        <Icon
          className={cn(
            "size-3.5",
            attention ? "text-amber-200/80" : "text-white/35",
          )}
          aria-hidden
        />
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-1.5 h-5 w-14" />
      ) : (
        <div
          className={cn(
            "mt-0.5 text-base font-semibold tabular-nums",
            attention ? "text-amber-100" : "text-white/85",
          )}
        >
          {value}
        </div>
      )}
      {sub && !loading ? (
        <div className="mt-0.5 truncate text-[10.5px] text-white/35">{sub}</div>
      ) : null}
    </div>
  );
}
