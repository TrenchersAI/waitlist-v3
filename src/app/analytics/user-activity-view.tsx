"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import { AnalyticsTimeseriesChart } from "@/src/app/analytics/analytics-timeseries-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";

// Mirrors the shape returned by /api/analytics/user-activity.
type DayPoint = { date: string; count: number };
type UserActivityPayload = {
  floor: string;
  users: {
    activeByDay: DayPoint[];
    newByDay: DayPoint[];
    totalUsers: number;
  };
  bots: {
    activeByDay: DayPoint[];
    currentActive: { live: number; paper: number };
    totalLiveBots: number;
  };
};

type SubView = "users" | "bots";

type RangeKey = "7d" | "14d" | "30d" | "90d" | "all";
const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7d", label: "7D", days: 7 },
  { key: "14d", label: "14D", days: 14 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "all", label: "All", days: null },
];

function formatShortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

/** Drop leading days with zero across every provided series so the "All" axis
   starts at first activity rather than the hardcoded floor. Trims all series by
   the same cut so they stay aligned. */
function trimLeadingEmpty(series: DayPoint[][]): DayPoint[][] {
  if (series.length === 0 || series[0].length === 0) return series;
  const len = series[0].length;
  let cut = 0;
  while (cut < len && series.every((s) => (s[cut]?.count ?? 0) === 0)) cut++;
  return series.map((s) => s.slice(cut));
}

function sliceTail<T>(arr: T[], days: number | null): T[] {
  return days ? arr.slice(-days) : arr;
}

function sum(points: DayPoint[]): number {
  return points.reduce((a, p) => a + p.count, 0);
}

function avg(points: DayPoint[]): number {
  return points.length ? sum(points) / points.length : 0;
}

function peak(points: DayPoint[]): DayPoint | null {
  return points.reduce<DayPoint | null>(
    (best, p) => (best == null || p.count > best.count ? p : best),
    null,
  );
}

export function UserActivityContent() {
  const [data, setData] = useState<UserActivityPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState<SubView>("users");
  const [range, setRange] = useState<RangeKey>("30d");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/user-activity", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as UserActivityPayload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = data === null && error === null;
  const rangeDays = RANGES.find((r) => r.key === range)?.days ?? null;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <AllTimeStrip data={data} sub={sub} />
      <SubToggle sub={sub} onChange={setSub} />
      <RangePills active={range} onPick={setRange} />

      {error ? (
        <Card>
          <CardContent className="flex h-[220px] items-center justify-center text-sm text-white/40">
            Couldn&apos;t load user activity ({error}).
          </CardContent>
        </Card>
      ) : sub === "users" ? (
        <UsersDashboard data={data} rangeDays={rangeDays} rangeKey={range} loading={loading} />
      ) : (
        <BotsDashboard data={data} rangeDays={rangeDays} rangeKey={range} loading={loading} />
      )}
    </div>
  );
}

// =========================================================================
// USERS DASHBOARD  — DAU (headline) + new signups overlay
// =========================================================================

function UsersDashboard({
  data,
  rangeDays,
  rangeKey,
  loading,
}: {
  data: UserActivityPayload | null;
  rangeDays: number | null;
  rangeKey: RangeKey;
  loading: boolean;
}) {
  const derived = useMemo(() => {
    if (!data) return null;
    let active = data.users.activeByDay;
    let fresh = data.users.newByDay;
    if (rangeKey === "all") {
      [active, fresh] = trimLeadingEmpty([active, fresh]);
    }
    const activeR = sliceTail(active, rangeDays);
    const freshR = sliceTail(fresh, rangeDays);

    // Prior equal-length window, for the hero delta.
    let priorAvg: number | null = null;
    if (rangeDays && active.length >= rangeDays * 2) {
      priorAvg = avg(active.slice(-rangeDays * 2, -rangeDays));
    }
    const avgDau = avg(activeR);
    return {
      activeR,
      freshR,
      avgDau,
      priorAvg,
      todayActive: activeR.length ? activeR[activeR.length - 1].count : 0,
      peakDau: peak(activeR),
      newInRange: sum(freshR),
      totalUsers: data.users.totalUsers,
    };
  }, [data, rangeDays, rangeKey]);

  return (
    <>
      <HeroMetric
        label="Average daily active users"
        value={derived ? Math.round(derived.avgDau) : null}
        prior={derived?.priorAvg ?? null}
        current={derived?.avgDau ?? null}
        subtitle={
          derived
            ? `Peak ${derived.peakDau?.count ?? 0} DAU${
                derived.peakDau ? ` on ${formatShortDate(derived.peakDau.date)}` : ""
              } · ${derived.newInRange} new signups in range`
            : null
        }
        spark={derived?.activeR.map((d) => d.count) ?? null}
      />

      <ActivityCard
        title="Daily active users"
        description="Distinct users who traded per UTC day (bright bar = brand-new signups that day)."
        loading={loading}
        empty={derived != null && derived.activeR.length === 0}
        chart={
          derived ? (
            <AnalyticsTimeseriesChart
              signupsByDay={derived.activeR}
              verificationsByDay={derived.freshR}
              showSecondaryBar
              primaryLabel="active"
              secondaryLabel="new"
              primaryLegend="Active users"
              secondaryLegend="New signups"
            />
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Active today"
          value={derived ? String(derived.todayActive) : null}
          hint={derived ? "Distinct users active so far today (UTC)" : null}
          sparkValues={derived?.activeR.map((d) => d.count) ?? null}
        />
        <KpiCard
          label="New signups (range)"
          value={derived ? String(derived.newInRange) : null}
          hint={derived ? "New product accounts created in this window" : null}
          sparkValues={derived?.freshR.map((d) => d.count) ?? null}
        />
        <KpiCard
          label="Total users"
          value={derived ? derived.totalUsers.toLocaleString("en-US") : null}
          hint={derived ? "All-time product accounts" : null}
          sparkValues={derived?.activeR.map((d) => d.count) ?? null}
        />
      </div>
    </>
  );
}

// =========================================================================
// BOTS DASHBOARD — live active-now (headline) + daily active bots
// =========================================================================

function BotsDashboard({
  data,
  rangeDays,
  rangeKey,
  loading,
}: {
  data: UserActivityPayload | null;
  rangeDays: number | null;
  rangeKey: RangeKey;
  loading: boolean;
}) {
  const derived = useMemo(() => {
    if (!data) return null;
    let active = data.bots.activeByDay;
    if (rangeKey === "all") {
      [active] = trimLeadingEmpty([active]);
    }
    const activeR = sliceTail(active, rangeDays);
    return {
      activeR,
      avgPerDay: avg(activeR),
      peakDay: peak(activeR),
      liveNow: data.bots.currentActive.live,
      paperNow: data.bots.currentActive.paper,
      totalLiveBots: data.bots.totalLiveBots,
    };
  }, [data, rangeDays, rangeKey]);

  return (
    <>
      <HeroMetric
        label="Live bots active now"
        value={derived ? derived.liveNow : null}
        // The headline is a live snapshot, so there's no prior-window delta.
        prior={null}
        current={null}
        subtitle={
          derived
            ? `${derived.paperNow} paper bots active · avg ${derived.avgPerDay.toFixed(1)} live bots trading/day`
            : null
        }
        spark={derived?.activeR.map((d) => d.count) ?? null}
      />

      <ActivityCard
        title="Daily active bots"
        description="Distinct live bots that placed a confirmed trade per UTC day."
        loading={loading}
        empty={derived != null && derived.activeR.length === 0}
        chart={
          derived ? (
            <AnalyticsTimeseriesChart
              signupsByDay={derived.activeR}
              verificationsByDay={derived.activeR}
              primaryLabel="active bots"
              secondaryLabel="active bots"
              primaryLegend="Active bots"
            />
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Active now (live)"
          value={derived ? String(derived.liveNow) : null}
          hint={derived ? `+ ${derived.paperNow} paper bots in active state` : null}
          sparkValues={derived?.activeR.map((d) => d.count) ?? null}
        />
        <KpiCard
          label="Peak active / day"
          value={derived ? String(derived.peakDay?.count ?? 0) : null}
          hint={
            derived && derived.peakDay
              ? `on ${formatShortDate(derived.peakDay.date)} (UTC)`
              : null
          }
          sparkValues={derived?.activeR.map((d) => d.count) ?? null}
        />
        <KpiCard
          label="Total live bots"
          value={derived ? derived.totalLiveBots.toLocaleString("en-US") : null}
          hint={derived ? "All-time non-paper bots created" : null}
          sparkValues={derived?.activeR.map((d) => d.count) ?? null}
        />
      </div>
    </>
  );
}

// =========================================================================
// SHARED CHROME  (mirrors the Dashboard section's primitives)
// =========================================================================

function SubToggle({
  sub,
  onChange,
}: {
  sub: SubView;
  onChange: (s: SubView) => void;
}) {
  return (
    <div className="inline-flex w-fit rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
      {(
        [
          { key: "users", label: "Users" },
          { key: "bots", label: "Bots" },
        ] as const
      ).map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => onChange(v.key)}
          className={cn(
            "rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
            sub === v.key
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white/80",
          )}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

function RangePills({
  active,
  onPick,
}: {
  active: RangeKey;
  onPick: (k: RangeKey) => void;
}) {
  return (
    <nav
      aria-label="Range presets"
      className="flex w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-1"
    >
      {RANGES.map((r) => {
        const isActive = active === r.key;
        return (
          <button
            key={r.key}
            type="button"
            onClick={() => onPick(r.key)}
            className={cn(
              "inline-flex flex-1 shrink-0 items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-white text-zinc-950"
                : "text-white/65 hover:bg-white/[0.04] hover:text-white",
            )}
          >
            {r.label}
          </button>
        );
      })}
    </nav>
  );
}

/** Fixed all-time summary strip — mirrors the Dashboard's AllTimeStrip. */
function AllTimeStrip({
  data,
  sub,
}: {
  data: UserActivityPayload | null;
  sub: SubView;
}) {
  const isUsers = sub === "users";
  return (
    <Card className="border-white/10 bg-white/[0.02]">
      <CardContent className="flex flex-wrap items-end justify-between gap-3 p-4 sm:p-5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-white/45 uppercase">
            {isUsers ? "All-time users" : "Live bots — active now"}
          </p>
          {data ? (
            <p className="mt-1 text-2xl font-medium tabular-nums tracking-tight text-white sm:text-3xl">
              {isUsers
                ? data.users.totalUsers.toLocaleString("en-US")
                : data.bots.currentActive.live}
            </p>
          ) : (
            <Skeleton className="mt-1 h-8 w-24" />
          )}
        </div>
        <div className="text-xs text-white/45">
          {data ? (
            isUsers ? (
              <>
                <span className="tabular-nums text-white/75">
                  {data.bots.totalLiveBots.toLocaleString("en-US")}
                </span>{" "}
                live bots created all-time
              </>
            ) : (
              <>
                <span className="tabular-nums text-white/75">
                  {data.bots.currentActive.paper}
                </span>{" "}
                paper ·{" "}
                <span className="tabular-nums text-white/75">
                  {data.bots.totalLiveBots.toLocaleString("en-US")}
                </span>{" "}
                total live bots
              </>
            )
          ) : (
            <Skeleton className="h-3 w-40" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HeroMetric({
  label,
  value,
  current,
  prior,
  subtitle,
  spark,
}: {
  label: string;
  value: number | null;
  current: number | null;
  prior: number | null;
  subtitle: string | null;
  spark: number[] | null;
}) {
  const deltaPct =
    current != null && prior != null && prior > 0
      ? ((current - prior) / prior) * 100
      : null;
  const tone: "up" | "down" | "flat" =
    deltaPct == null ? "flat" : deltaPct > 0 ? "up" : deltaPct < 0 ? "down" : "flat";
  const glyph = tone === "up" ? "↑" : tone === "down" ? "↓" : "";

  return (
    <Card className="relative overflow-hidden border-white/10 bg-black/55 shadow-2xl shadow-black/40 ring-1 ring-white/[0.04] backdrop-blur-md">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[min(720px,110%)] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(94,104,255,0.22),transparent_72%)] blur-2xl"
      />
      <CardContent className="relative flex flex-col gap-6 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/45 uppercase">
            {label}
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            {value != null ? (
              <span className="text-4xl font-medium tabular-nums tracking-tight text-white sm:text-6xl">
                {value.toLocaleString("en-US")}
              </span>
            ) : (
              <Skeleton className="h-12 w-28 sm:h-16 sm:w-40" />
            )}
            {deltaPct != null ? (
              <span
                className={cn(
                  "text-sm font-medium tabular-nums",
                  tone === "up"
                    ? "text-white"
                    : tone === "down"
                      ? "text-white/55"
                      : "text-white/50",
                )}
              >
                {glyph} {Math.abs(Math.round(deltaPct))}%
                <span className="font-normal text-white/35"> vs prior window</span>
              </span>
            ) : null}
          </div>
          {subtitle != null ? (
            <p className="mt-3 text-sm text-white/55">{subtitle}</p>
          ) : (
            <Skeleton className="mt-3 h-4 w-56" />
          )}
        </div>

        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          {spark && spark.length > 1 ? (
            <Sparkline values={spark} width={200} height={52} />
          ) : (
            <Skeleton className="h-12 w-48" />
          )}
          <span className="text-[10px] font-medium tracking-[0.15em] text-white/35 uppercase">
            trend
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityCard({
  title,
  description,
  loading,
  empty,
  chart,
}: {
  title: string;
  description: string;
  loading: boolean;
  empty: boolean;
  chart: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : empty ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-white/40">
            No activity in this window.
          </div>
        ) : (
          chart
        )}
      </CardContent>
    </Card>
  );
}

function KpiCard({
  label,
  value,
  hint,
  sparkValues,
}: {
  label: string;
  value: string | null;
  hint: string | null;
  sparkValues: number[] | null;
}) {
  return (
    <Card>
      <CardHeader className="gap-3 border-b-0 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{label}</CardDescription>
          <span className="rounded-full border border-white/12 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/55">
            In range
          </span>
        </div>
        {value != null ? (
          <CardTitle className="text-3xl font-medium tabular-nums tracking-tight text-white">
            {value}
          </CardTitle>
        ) : (
          <Skeleton className="h-8 w-24" />
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {hint != null ? (
          <p className="text-xs text-white/45">{hint}</p>
        ) : (
          <Skeleton className="h-3 w-44 max-w-full" />
        )}
        <div className="w-full">
          {sparkValues === null ? (
            <Skeleton className="h-9 w-full" />
          ) : sparkValues.length > 1 ? (
            <Sparkline
              values={sparkValues}
              width={260}
              height={36}
              color="rgb(129 140 248)"
              strokeWidth={1.25}
              fluid
            />
          ) : (
            <div aria-hidden />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Copy of the Dashboard's Sparkline so the two sections render identically. */
function Sparkline({
  values,
  width,
  height,
  color = "white",
  strokeWidth = 1.5,
  fluid = false,
}: {
  values: number[];
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
  fluid?: boolean;
}) {
  if (values.length < 2) {
    return (
      <div
        style={fluid ? { height } : { width, height }}
        className={fluid ? "w-full" : undefined}
        aria-hidden
      />
    );
  }
  const max = Math.max(1, ...values);
  const pad = strokeWidth;
  const w = width;
  const h = height;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - pad * 2) + pad;
      const y = h - pad - (v / max) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
  const areaPts = `${pad},${h} ${pts} ${w - pad},${h}`;
  return (
    <svg
      width={fluid ? "100%" : w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={fluid ? "block w-full" : "block"}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={`ua-spark-fill-${width}-${height}`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#ua-spark-fill-${width}-${height})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeOpacity="0.85"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
    </svg>
  );
}
