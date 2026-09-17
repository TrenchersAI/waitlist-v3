"use client";

import { useEffect, useMemo, useState } from "react";

import {
  TradingBarChart,
  type ChartView,
  type TradingDay,
} from "@/src/app/analytics/trading-bar-chart";
import { TradersPanel } from "@/src/app/analytics/traders-panel";
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

// One day of paper bot volume, mirrored from `trenchers-paper.ts`.
type PaperDay = {
  date: string; // YYYY-MM-DD (UTC)
  total: number;
  buy: number;
  sell: number;
};

type PaperPayload = {
  floor: string;
  volume: PaperDay[];
};

// The stacked chart is bot/manual-shaped; paper has no manual leg, so the two
// stack segments are buys (indigo, bottom) and sells (teal, top).
const BUY_COLOR = "#818cf8";
const SELL_COLOR = "#2dd4bf";

function toChartDay(d: PaperDay): TradingDay {
  return { date: d.date, total: d.total, bot: d.buy, manual: d.sell };
}

function sumKey(days: PaperDay[], key: "total" | "buy" | "sell"): number {
  return days.reduce((acc, d) => acc + d[key], 0);
}

/** The Paper volume dashboard — the paper-bot twin of Trading volume. Same
 *  layout (headline cards, range pills, stacked daily/cumulative chart, click a
 *  bar for that day's traders), fed only by paper bot fills. */
export function PaperAnalyticsContent() {
  const [data, setData] = useState<PaperPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("all");
  const [view, setView] = useState<ChartView>("daily");
  // Per-day drill-down: click a bar to list that day's paper bot traders.
  // There is only one order kind in paper, so no Manual/Bot chooser step.
  const [pickedDay, setPickedDay] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // `loading` starts true and `error` null, so no synchronous setState here
    // (fetch runs once on mount; deps are empty).
    fetch("/api/analytics/paper", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as PaperPayload;
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

  const allDays = useMemo(() => data?.volume ?? [], [data]);

  const rangeDays = RANGES.find((r) => r.key === range)?.days ?? null;
  const days = useMemo(
    () => (rangeDays ? allDays.slice(-rangeDays) : allDays),
    [allDays, rangeDays],
  );
  const chartDays = useMemo(() => days.map(toChartDay), [days]);

  const totals = useMemo(
    () => ({
      total: sumKey(days, "total"),
      buy: sumKey(days, "buy"),
      sell: sumKey(days, "sell"),
    }),
    [days],
  );

  // Extra headline stats: average per active day, best day, and the trend vs
  // the immediately-preceding window of equal length.
  const derived = useMemo(() => {
    const activeDays = days.filter((d) => d.total > 0).length;
    const avg = activeDays > 0 ? totals.total / activeDays : 0;
    const peak = days.reduce<PaperDay | null>(
      (best, d) => (best == null || d.total > best.total ? d : best),
      null,
    );
    let trendPct: number | null = null;
    if (rangeDays && allDays.length >= rangeDays * 2) {
      const prev = allDays.slice(-rangeDays * 2, -rangeDays);
      const prevSum = sumKey(prev, "total");
      if (prevSum > 0) trendPct = ((totals.total - prevSum) / prevSum) * 100;
    }
    return { avg, peak, trendPct };
  }, [days, totals.total, rangeDays, allDays]);

  const buyPct = totals.total > 0 ? Math.round((totals.buy / totals.total) * 100) : 0;
  const sellPct = totals.total > 0 ? 100 - buyPct : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Paper volume</CardTitle>
            <CardDescription>
              SOL traded by paper bots per day since Jul 25 — each bar is the
              day&apos;s total paper volume, stacked into buys and sells. Live
              bots and manual trading are excluded.
            </CardDescription>
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* headline stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total paper volume"
            value={fmtSol(totals.total)}
            loading={loading}
            accent
            trendPct={derived.trendPct}
          />
          <StatCard
            label="Buys"
            value={fmtSol(totals.buy)}
            sub={`${buyPct}% of total`}
            dotColor={BUY_COLOR}
            loading={loading}
          />
          <StatCard
            label="Sells"
            value={fmtSol(totals.sell)}
            sub={`${sellPct}% of total`}
            dotColor={SELL_COLOR}
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
            Couldn&apos;t load paper trading data ({error}).
          </div>
        ) : allDays.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-white/40">
            No paper trading data yet (or TRENCHERS_DATABASE_URL is unset).
          </div>
        ) : (
          <TradingBarChart
            days={chartDays}
            view={view}
            unit="SOL"
            botLegend="Buys"
            manualLegend="Sells"
            onPickDay={setPickedDay}
            pickedDate={pickedDay}
          />
        )}

        {/* Per-day drill-down: click a bar → that day's paper bot traders. */}
        {pickedDay ? (
          <TradersPanel
            kind="paper"
            date={pickedDay}
            onClose={() => setPickedDay(null)}
          />
        ) : !loading && allDays.length > 0 ? (
          <p className="text-center text-[11px] text-white/30">
            Tip: click any <span className="text-white/50">bar</span> to see
            the users whose paper bots traded that day.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
