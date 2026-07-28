"use client";

import { useEffect, useMemo, useState } from "react";

import { AnalyticsTimeseriesChart } from "@/src/app/analytics/analytics-timeseries-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";

type TradingDay = { date: string; total: number; bot: number; manual: number };

type TradingPayload = {
  floor: string;
  volume: TradingDay[];
  revenue: TradingDay[];
};

/** Which dashboard this instance renders. */
type Metric = "volume" | "revenue";

function fmtSol(n: number): string {
  // Compact-ish SOL: 2 dp under 100, else whole with thousands separators.
  if (n === 0) return "0";
  if (n < 100) return n.toFixed(n < 1 ? 3 : 2);
  return Math.round(n).toLocaleString("en-US");
}

function sum(days: TradingDay[], key: keyof TradingDay): number {
  return days.reduce((acc, d) => acc + (d[key] as number), 0);
}

const COPY: Record<
  Metric,
  { title: string; description: string; totalLabel: string }
> = {
  volume: {
    title: "Trading volume",
    description:
      "SOL traded per day since Jul 25 — each bar is the day's total, with the live-bot share highlighted and manual the remainder.",
    totalLabel: "Total volume",
  },
  revenue: {
    title: "Trading revenue",
    description:
      "Platform fees collected per day (SOL, from fee_ledger) since Jul 25 — each bar is the day's total, split bot vs manual.",
    totalLabel: "Total revenue",
  },
};

export function TradingAnalyticsContent({ metric }: { metric: Metric }) {
  const [data, setData] = useState<TradingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const days = useMemo(
    () => (metric === "volume" ? data?.volume ?? [] : data?.revenue ?? []),
    [data, metric],
  );
  const copy = COPY[metric];
  const unit = "SOL";

  const totals = useMemo(
    () => ({
      total: sum(days, "total"),
      bot: sum(days, "bot"),
      manual: sum(days, "manual"),
    }),
    [days],
  );

  // Chart series: primary = total bar, secondary overlay = bot (manual is the
  // remainder above the bot segment). Mirrors the Referrals chart (total +
  // referred subset).
  const totalSeries = useMemo(
    () => days.map((d) => ({ date: d.date, count: d.total })),
    [days],
  );
  const botSeries = useMemo(
    () => days.map((d) => ({ date: d.date, count: d.bot })),
    [days],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: copy.totalLabel, value: totals.total, accent: true },
            { label: "Bot", value: totals.bot, accent: false },
            { label: "Manual", value: totals.manual, accent: false },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
            >
              <div className="text-xs text-white/50">{s.label}</div>
              {loading ? (
                <Skeleton className="mt-1 h-6 w-20" />
              ) : (
                <div
                  className={
                    s.accent
                      ? "mt-1 text-xl font-semibold text-white"
                      : "mt-1 text-xl font-semibold text-white/80"
                  }
                >
                  {fmtSol(s.value)}{" "}
                  <span className="text-xs font-normal text-white/40">
                    {unit}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Per-day stacked chart */}
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : error ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-white/40">
            Couldn&apos;t load trading data ({error}).
          </div>
        ) : days.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-white/40">
            No trading data yet (or TRENCHERS_DATABASE_URL is unset).
          </div>
        ) : (
          <AnalyticsTimeseriesChart
            signupsByDay={totalSeries}
            verificationsByDay={botSeries}
            showSecondaryBar
            primaryLabel={`Total ${metric} (${unit})`}
            secondaryLabel={`Bot ${metric}`}
            primaryLegend={`Total ${metric}`}
            secondaryLegend="Bot (manual = remainder)"
          />
        )}
      </CardContent>
    </Card>
  );
}
