"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";

import {
  TradingBarChart,
  type ChartView,
  type TradingDay,
} from "@/src/app/analytics/trading-bar-chart";
import { TradersPanel } from "@/src/app/analytics/traders-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";

type TradingPayload = {
  floor: string;
  volume: TradingDay[];
  revenue: TradingDay[];
};

/** Which dashboard this instance renders. */
type Metric = "volume" | "revenue";

/** Which per-user breakdown is open below the chart (volume dashboard only). */
type TradersKind = "manual" | "bot";

type RangeKey = "7d" | "14d" | "30d" | "all";
const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7d", label: "7D", days: 7 },
  { key: "14d", label: "14D", days: 14 },
  { key: "30d", label: "30D", days: 30 },
  { key: "all", label: "All", days: null },
];

// ◎ SOL formatting shared with the summary cards.
function fmtSol(n: number): string {
  const a = Math.abs(n);
  if (a >= 100_000) return `${(n / 1000).toFixed(0)}k`;
  if (a >= 1000) return Math.round(n).toLocaleString("en-US");
  if (a >= 1) return n.toFixed(2);
  if (a === 0) return "0";
  return n.toFixed(a < 0.001 ? 5 : 3);
}

function sumKey(days: TradingDay[], key: "total" | "bot" | "manual"): number {
  return days.reduce((acc, d) => acc + d[key], 0);
}

const COPY: Record<
  Metric,
  { title: string; description: string; totalLabel: string }
> = {
  volume: {
    title: "Trading volume",
    description:
      "SOL traded per day since Jul 25 — each bar is the day's total, stacked into live-bot and manual volume.",
    totalLabel: "Total volume",
  },
  revenue: {
    title: "Trading revenue",
    description:
      "Platform fees collected per day (SOL, from fee_ledger) since Jul 25 — stacked bot vs manual.",
    totalLabel: "Total revenue",
  },
};

export function TradingAnalyticsContent({ metric }: { metric: Metric }) {
  const [data, setData] = useState<TradingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("all");
  const [view, setView] = useState<ChartView>("daily");
  // Per-day order drill-down (volume dashboard only): click a bar to pick a
  // day, then choose Manual or Bot to see that day's traders. `pickedDay` is
  // the clicked UTC day; `pickedKind` is null until they choose a side.
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [pickedKind, setPickedKind] = useState<TradersKind | null>(null);

  useEffect(() => {
    let cancelled = false;
    // `loading` starts true and `error` null, so no synchronous setState here
    // (fetch runs once on mount; deps are empty).
    fetch("/api/analytics/trading", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as TradingPayload;
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

  const copy = COPY[metric];

  const allDays = useMemo(
    () => (metric === "volume" ? data?.volume ?? [] : data?.revenue ?? []),
    [data, metric],
  );

  const rangeDays = RANGES.find((r) => r.key === range)?.days ?? null;
  const days = useMemo(
    () => (rangeDays ? allDays.slice(-rangeDays) : allDays),
    [allDays, rangeDays],
  );

  const totals = useMemo(
    () => ({
      total: sumKey(days, "total"),
      bot: sumKey(days, "bot"),
      manual: sumKey(days, "manual"),
    }),
    [days],
  );

  // Extra headline stats: average per active day, best day, and the trend vs
  // the immediately-preceding window of equal length.
  const derived = useMemo(() => {
    const activeDays = days.filter((d) => d.total > 0).length;
    const avg = activeDays > 0 ? totals.total / activeDays : 0;
    const peak = days.reduce<TradingDay | null>(
      (best, d) => (best == null || d.total > best.total ? d : best),
      null,
    );
    // Trend: current window sum vs the equal-length window right before it.
    let trendPct: number | null = null;
    if (rangeDays && allDays.length >= rangeDays * 2) {
      const prev = allDays.slice(-rangeDays * 2, -rangeDays);
      const prevSum = sumKey(prev, "total");
      if (prevSum > 0) trendPct = ((totals.total - prevSum) / prevSum) * 100;
    }
    return { avg, peak, trendPct };
  }, [days, totals.total, rangeDays, allDays]);

  const botPct = totals.total > 0 ? Math.round((totals.bot / totals.total) * 100) : 0;
  const manualPct = totals.total > 0 ? 100 - botPct : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* headline stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={copy.totalLabel}
            value={fmtSol(totals.total)}
            loading={loading}
            accent
            trendPct={derived.trendPct}
          />
          <StatCard
            label="Manual"
            value={fmtSol(totals.manual)}
            sub={`${manualPct}% of total`}
            dotColor="#2dd4bf"
            loading={loading}
          />
          <StatCard
            label="Bot"
            value={fmtSol(totals.bot)}
            sub={`${botPct}% of total`}
            dotColor="#818cf8"
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
            Couldn&apos;t load trading data ({error}).
          </div>
        ) : allDays.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-white/40">
            No trading data yet (or TRENCHERS_DATABASE_URL is unset).
          </div>
        ) : (
          <TradingBarChart
            days={days}
            view={view}
            unit="SOL"
            botLegend="Bot"
            manualLegend="Manual"
            onPickDay={
              metric === "volume"
                ? (date) => {
                    setPickedDay(date);
                    setPickedKind(null); // re-show the chooser for the new day
                  }
                : undefined
            }
            pickedDate={metric === "volume" ? pickedDay : null}
          />
        )}

        {/* Per-day order drill-down: click a bar → choose Manual/Bot → list. */}
        {metric === "volume" && pickedDay ? (
          pickedKind ? (
            <TradersPanel
              kind={pickedKind}
              date={pickedDay}
              onBack={() => setPickedKind(null)}
              onClose={() => {
                setPickedDay(null);
                setPickedKind(null);
              }}
            />
          ) : (
            <OrderKindChooser
              day={days.find((d) => d.date === pickedDay) ?? null}
              onPick={setPickedKind}
              onClose={() => setPickedDay(null)}
            />
          )
        ) : metric === "volume" && !loading && allDays.length > 0 ? (
          <p className="text-center text-[11px] text-white/30">
            Tip: click any{" "}
            <span className="text-white/50">bar</span> to see the manual or bot
            orders placed that day.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// After a bar is clicked, offer the two order types for that day. Each button
// shows the day's SOL split (already known from the chart data) so the choice
// is informed before we fetch the per-user list.
function OrderKindChooser({
  day,
  onPick,
  onClose,
}: {
  day: TradingDay | null;
  onPick: (kind: TradersKind) => void;
  onClose: () => void;
}) {
  const label = day
    ? new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : "";
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-white/55">
          <span className="font-medium text-white/85">{label}</span> — which
          orders?
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-[11px] text-white/40 transition-colors hover:text-white/80"
        >
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <OrderKindButton
          kind="manual"
          dotColor="#2dd4bf"
          sol={day?.manual ?? 0}
          onClick={() => onPick("manual")}
        />
        <OrderKindButton
          kind="bot"
          dotColor="#818cf8"
          sol={day?.bot ?? 0}
          onClick={() => onPick("bot")}
        />
      </div>
    </div>
  );
}

function OrderKindButton({
  kind,
  dotColor,
  sol,
  onClick,
}: {
  kind: TradersKind;
  dotColor: string;
  sol: number;
  onClick: () => void;
}) {
  const title = kind === "manual" ? "Manual orders" : "Bot orders";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-white/25 hover:bg-white/[0.05]"
    >
      <span className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="size-2.5 rounded-sm"
          style={{ background: dotColor }}
        />
        <span className="text-sm font-medium text-white/90">{title}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="font-mono text-sm tabular-nums text-white/70">
          ◎{fmtSol(sol)}
        </span>
        <ChevronRight className="size-4 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60" />
      </span>
    </button>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ChartView;
  onChange: (v: ChartView) => void;
}) {
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
      {(["daily", "cumulative"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
            view === v
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white/80",
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  dotColor,
  trendPct,
  loading,
  onClick,
  active,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  dotColor?: string;
  trendPct?: number | null;
  loading: boolean;
  /** When set, the card becomes a button that opens a drill-down. */
  onClick?: () => void;
  active?: boolean;
}) {
  const up = trendPct != null && trendPct >= 0;
  const clickable = Boolean(onClick);
  // A real <button> when clickable (bulletproof hit target + keyboard support),
  // a plain <div> otherwise. `text-left` + `w-full` keep the button visually
  // identical to the static cards.
  const Tag = clickable ? "button" : "div";
  return (
    <Tag
      {...(clickable
        ? { type: "button" as const, onClick }
        : {})}
      className={cn(
        "block w-full rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-white/25 bg-white/[0.06]"
          : "border-white/10 bg-white/[0.02]",
        clickable &&
          "cursor-pointer outline-none hover:border-white/20 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-white/20",
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-white/50">
        {dotColor ? (
          <span
            className="size-2 rounded-sm"
            style={{ background: dotColor }}
            aria-hidden
          />
        ) : null}
        {label}
        {clickable ? (
          <ChevronRight
            className={cn(
              "ml-auto size-3.5 text-white/40 transition-transform",
              active && "rotate-90 text-white/70",
            )}
            aria-hidden
          />
        ) : null}
      </div>
      {loading ? (
        <Skeleton className="mt-1.5 h-6 w-20" />
      ) : (
        <div className="mt-1 flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-xl font-semibold tabular-nums",
              accent ? "text-white" : "text-white/85",
            )}
          >
            {value}
          </span>
          <span className="text-[10px] font-normal text-white/40">◎</span>
          {trendPct != null ? (
            <span
              className={cn(
                "ml-1 inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
                up ? "text-emerald-400" : "text-rose-400",
              )}
              title="vs. previous period"
            >
              {up ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {Math.abs(Math.round(trendPct))}%
            </span>
          ) : null}
        </div>
      )}
      {sub && !loading ? (
        <div className="mt-0.5 truncate text-[11px] text-white/35">{sub}</div>
      ) : null}
    </Tag>
  );
}
