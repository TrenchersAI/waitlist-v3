"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";

import { AnalyticsTimeseriesChart } from "../analytics-timeseries-chart";

type FunnelStep = { key: string; label: string; count: number };
type HourPoint = { date: string; count: number };
type DistRow = { key: string; label: string; count: number };
type EngagementRow = { key: string; label: string; count: number };
type CountryRow = {
  key: string;
  label: string;
  count: number;
  source: "user" | "ip";
};
type FreeformRow = {
  email: string;
  country: string | null;
  twitter: string | null;
  telegram: string | null;
  volume: string | null;
  freeform: string;
  submittedAt: string | null;
};

type Payload = {
  campaign: string;
  funnel: FunnelStep[];
  engagement: EngagementRow[];
  distributions: {
    tools: DistRow[];
    volume: DistRow[];
    wants: DistRow[];
  };
  countries: CountryRow[];
  freeform: FreeformRow[];
  hourly: {
    windowHours: number;
    sends: HourPoint[];
    started: HourPoint[];
    completed: HourPoint[];
  };
  generatedAt: string;
};

function pct(n: number, d: number) {
  if (!d) return "-";
  return `${((n / d) * 100).toFixed(1)}%`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatShortDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

/// Standalone wrapper used by the (now-redirect) /analytics/survey route.
/// Wraps the content in the site canvas + a page header. New consumers
/// should embed `<SurveyAnalyticsContent />` directly instead (see the
/// dashboard's `SurveySection`) — this exists so the bookmarkable URL
/// keeps working.
export default function SurveyAnalyticsView({
  viewerEmail,
}: {
  viewerEmail: string;
}) {
  return (
    <div className="site-canvas-bg flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/8 pb-5">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-white/40 uppercase">
              Trenchers · Survey analytics
            </p>
            <h1 className="mt-1 text-2xl font-medium tracking-tight text-white">
              Trader research v1
            </h1>
            <p className="mt-1 text-xs text-white/45">
              Signed in as <span className="text-white/70">{viewerEmail}</span>
            </p>
          </div>
          <Link
            href="/analytics"
            className="inline-flex h-9 items-center rounded-lg border border-white/12 bg-white/[0.04] px-3 text-sm text-white/85 hover:bg-white/10"
          >
            ← Waitlist analytics
          </Link>
        </header>

        <SurveyAnalyticsContent />
      </main>
    </div>
  );
}

/// Content-only variant. Renders just the cards + funnel rows, with no
/// page header or outer canvas wrapper. Used by the main dashboard so
/// "Survey" becomes a real tab alongside Dashboard / Referrals / etc.
export function SurveyAnalyticsContent() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/analytics/survey", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setError(`HTTP ${res.status}`);
          return;
        }
        const payload = (await res.json()) as Payload;
        if (!cancelled) setData(payload);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const topOfFunnel = useMemo(
    () => data?.funnel.find((s) => s.key === "sent")?.count ?? 0,
    [data],
  );
  const startedCount = useMemo(
    () => data?.funnel.find((s) => s.key === "started")?.count ?? 0,
    [data],
  );

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <Card className="border-amber-400/30 bg-amber-400/10">
          <CardContent className="p-4 text-sm text-amber-100">
            Failed to load: {error}
          </CardContent>
        </Card>
      ) : null}

      <FunnelCard data={data} />

      <LiveActivitySection data={data} />

      <div className="grid gap-4 lg:grid-cols-2">
        <EngagementCard data={data} startedCount={startedCount} />
        <CountriesCard data={data} />
      </div>

      {/* Tools has ~12 bars; give it the full row so columns have room to
          breathe instead of fighting the Volume chart for a half-width slot. */}
      <DistributionCard
        title="Tools used today"
        description="Multi-select: sums exceed response count."
        rows={data?.distributions.tools ?? null}
        total={startedCount}
        accent="indigo"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionCard
          title="Monthly trading volume"
          description="Single-select: totals to response count when answered."
          rows={data?.distributions.volume ?? null}
          total={
            data?.distributions.volume.reduce((s, r) => s + r.count, 0) ?? 0
          }
          accent="sky"
          ordered
        />
        <DistributionCard
          title="What an AI agent should help with"
          description="Multi-select: sums exceed response count."
          rows={data?.distributions.wants ?? null}
          total={startedCount}
          accent="white"
        />
      </div>

      <FreeformCard rows={data?.freeform ?? null} />

      <p className="text-[11px] text-white/35">
        Top-of-funnel: {topOfFunnel} invites sent in this campaign
        {data ? ` · generated ${formatDateTime(data.generatedAt)} UTC` : ""}.
      </p>
    </div>
  );
}

// =========================================================================
// VERTICAL COLUMN CHART (shared by every category breakdown)
// =========================================================================

type Accent = "white" | "indigo" | "emerald" | "sky";

// Solid bar fills — literal class strings so Tailwind's scanner keeps them.
// `bar` is the resting state, `barA` the hover/active highlight, `dot` is the
// tooltip swatch.
const ACCENTS: Record<
  Accent,
  { bar: string; barA: string; dot: string }
> = {
  white: { bar: "bg-white/55", barA: "bg-white", dot: "bg-white" },
  indigo: { bar: "bg-indigo-400/70", barA: "bg-indigo-300", dot: "bg-indigo-400" },
  emerald: { bar: "bg-emerald-400/70", barA: "bg-emerald-300", dot: "bg-emerald-400" },
  sky: { bar: "bg-sky-400/70", barA: "bg-sky-300", dot: "bg-sky-400" },
};

const CHART_H = 196; // total svg-less chart height in px
const TOP_RESERVE = 26; // headroom above the tallest bar for its value label

/// Animated vertical column chart. Bars grow on mount, brighten on hover, and
/// surface label + count + share in a floating tooltip. Long labels truncate
/// (two lines) with the full text available in the tooltip.
function ColumnChart({
  rows,
  total,
  accent = "white",
  ordered = false,
}: {
  rows: DistRow[];
  total: number;
  accent?: Accent;
  ordered?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const sorted = useMemo(
    () => (ordered ? rows : [...rows].sort((a, b) => b.count - a.count)),
    [rows, ordered],
  );

  if (sorted.length === 0) {
    return (
      <div className="flex h-[160px] items-center justify-center text-sm text-white/40">
        No data yet.
      </div>
    );
  }

  const max = Math.max(1, ...sorted.map((r) => r.count));
  const barArea = CHART_H - TOP_RESERVE;
  const a = ACCENTS[accent];

  // Each column needs enough room for the value label (e.g. "116") above the
  // bar AND a wrapped two-line axis label below (e.g. "Custom/private bots").
  // We always reserve that width and let the row scroll horizontally if the
  // parent card is narrower — works the same on phones, tablets, and desktop.
  const colMinPx = 56;
  const minRowPx = sorted.length * colMinPx;

  return (
    <div className="select-none">
      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:thin]">
        <div style={{ minWidth: minRowPx }}>
          <div className="relative" style={{ height: CHART_H }}>
            {/* gridlines only — each bar carries its own value label, so a
                separate max marker on the left just collided with the tallest
                column's number. */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <div
                key={t}
                aria-hidden
                className="absolute inset-x-0 border-t border-white/[0.05]"
                style={{ bottom: t * barArea }}
              />
            ))}

            <div className="flex h-full items-end gap-1.5 sm:gap-2">
              {sorted.map((r, i) => {
                const isActive = active === i;
                const target = r.count > 0 ? Math.max(4, (r.count / max) * barArea) : 0;
                return (
                  <div
                    key={r.key}
                    className="group flex h-full flex-1 flex-col items-center justify-end"
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive((cur) => (cur === i ? null : cur))}
                  >
                    <span
                      className={
                        "mb-1.5 text-[11px] tabular-nums transition-colors " +
                        (isActive ? "text-white" : "text-white/65")
                      }
                    >
                      {r.count}
                    </span>
                    <div
                      className="relative flex w-full justify-center"
                      style={{ height: mounted ? target : 0, transition: "none" }}
                    >
                      <div
                        className={
                          "w-[60%] min-w-[10px] max-w-[40px] rounded-t-[2px] " +
                          (isActive ? a.barA : a.bar)
                        }
                        style={{
                          height: mounted ? "100%" : 0,
                          transition: `height 700ms cubic-bezier(0.22,1,0.36,1) ${i * 35}ms`,
                        }}
                      />
                      {isActive ? (
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/12 bg-black/90 px-2.5 py-1.5 text-xs backdrop-blur">
                          <p className="max-w-[220px] truncate text-[11px] font-medium text-white">
                            {r.label}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/55">
                            <span className={"size-1.5 rounded-full " + a.dot} />
                            <span className="tabular-nums text-white/85">
                              {r.count}
                            </span>
                            <span>· {pct(r.count, total)}</span>
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex gap-1.5 border-t border-white/[0.06] pt-2 sm:gap-2">
            {sorted.map((r, i) => (
              <div
                key={r.key}
                className="flex-1 cursor-default px-0.5 text-center"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive((cur) => (cur === i ? null : cur))}
              >
                <span
                  title={r.label}
                  className={
                    "mx-auto block break-words text-[10px] leading-tight transition-colors " +
                    (active === i ? "text-white/90" : "text-white/55")
                  }
                >
                  {r.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ColumnChartSkeleton() {
  // Static, decreasing heights so the placeholder reads as a chart.
  const heights = [88, 72, 60, 50, 40, 30];
  return (
    <div className="flex h-[196px] items-end gap-2.5">
      {heights.map((h, i) => (
        <div key={i} className="flex-1">
          <Skeleton className="mx-auto w-[58%] max-w-[40px] rounded-t-[3px]" style={{ height: h }} />
        </div>
      ))}
    </div>
  );
}

// =========================================================================
// FUNNEL
// =========================================================================

function FunnelCard({ data }: { data: Payload | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Funnel</CardTitle>
        <CardDescription>
          From waitlist verification through to a submitted survey. Open rate
          is inflated by Apple Mail Privacy Protection, so trust click and
          submit rates more.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {data ? (
          <FunnelRows steps={data.funnel} />
        ) : (
          Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function FunnelRows({ steps }: { steps: FunnelStep[] }) {
  const top = steps[0]?.count ?? 0;
  // The "sent" row is the natural top of the email funnel itself —
  // conversion rates are clearest as a % of sent, but we also show the
  // first row's count (verified waitlist) for context.
  const sent = steps.find((s) => s.key === "sent")?.count ?? 0;
  return (
    <div className="flex flex-col gap-2.5">
      {steps.map((s, i) => {
        const prev = steps[i - 1];
        const prevPct =
          prev && prev.count > 0
            ? `${((s.count / prev.count) * 100).toFixed(1)}%`
            : null;
        const fromSentPct =
          sent > 0 && i > 1
            ? `${((s.count / sent) * 100).toFixed(1)}% of sent`
            : null;
        const widthPct =
          top > 0 ? Math.max(2, Math.round((s.count / top) * 100)) : 0;
        return (
          <div key={s.key} className="flex items-center gap-2 sm:gap-3">
            <div className="flex w-28 shrink-0 items-center gap-1.5 text-[11px] text-white/65 sm:w-44 sm:gap-2 sm:text-xs">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[10px] tabular-nums text-white/40">
                {i + 1}
              </span>
              <span className="truncate sm:whitespace-normal">{s.label}</span>
            </div>
            <div className="relative h-8 flex-1 overflow-hidden rounded-lg border border-white/10 bg-black/40">
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-lg bg-indigo-500/40"
                style={{ width: `${widthPct}%` }}
              />
              <div className="relative flex h-full items-center px-2.5 text-[12px] text-white/90 sm:px-3">
                <span className="text-sm font-semibold tabular-nums">
                  {s.count.toLocaleString()}
                </span>
                {prevPct ? (
                  <span className="ml-2 text-white/55">
                    · {prevPct}
                  </span>
                ) : null}
                {fromSentPct ? (
                  <span className="ml-2 hidden text-white/40 sm:inline">
                    · {fromSentPct}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =========================================================================
// LIVE ACTIVITY (per-hour sends + form fills)
// =========================================================================

function LiveActivitySection({ data }: { data: Payload | null }) {
  const windowHours = data?.hourly.windowHours ?? 48;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Emails sent · per hour</CardTitle>
          <CardDescription>
            First invites + reminders leaving Resend, by UTC hour (last{" "}
            {windowHours}h). Watch this while the reminder drip runs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data ? (
            <AnalyticsTimeseriesChart
              signupsByDay={data.hourly.sends}
              verificationsByDay={[]}
              bucketType="hour"
              primaryLabel="sent"
              primaryLegend="Emails sent"
            />
          ) : (
            <Skeleton className="h-[240px] w-full" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form fills · per hour</CardTitle>
          <CardDescription>
            People filling the survey, by UTC hour (last {windowHours}h). Bright
            bar = submitted, dim bar = started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data ? (
            <AnalyticsTimeseriesChart
              signupsByDay={data.hourly.started}
              verificationsByDay={data.hourly.completed}
              bucketType="hour"
              showSecondaryBar
              primaryLabel="started"
              secondaryLabel="submitted"
              primaryLegend="Started"
              secondaryLegend="Submitted"
            />
          ) : (
            <Skeleton className="h-[240px] w-full" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =========================================================================
// ENGAGEMENT (which fields people touched)
// =========================================================================

function EngagementCard({
  data,
  startedCount,
}: {
  data: Payload | null;
  startedCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Per-question engagement</CardTitle>
        <CardDescription>
          Counted on first interaction with each field. With a single-page
          survey this is the dropout proxy: a field with fewer rows than
          &quot;started&quot; is where attention died.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data ? (
          <ColumnChart
            rows={data.engagement}
            total={startedCount}
            accent="emerald"
            ordered
          />
        ) : (
          <ColumnChartSkeleton />
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// COUNTRIES
// =========================================================================

function CountriesCard({ data }: { data: Payload | null }) {
  const top = data?.countries.slice(0, 12) ?? [];
  const max = Math.max(1, ...top.map((c) => c.count));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Countries</CardTitle>
        <CardDescription>
          User-stated answer when available, otherwise IP-derived (ISO-2 code).
          Top 12 shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {data ? (
          top.length === 0 ? (
            <p className="text-sm text-white/45">No country data yet.</p>
          ) : (
            top.map((c, i) => {
              const w = Math.max(4, Math.round((c.count / max) * 100));
              return (
                <div
                  key={c.key}
                  className="relative flex items-center gap-3 overflow-hidden rounded-md px-2.5 py-1.5"
                >
                  <div
                    aria-hidden
                    className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-white/[0.09] to-transparent"
                    style={{ width: `${w}%` }}
                  />
                  <span className="relative w-4 text-[10px] tabular-nums text-white/30">
                    {i + 1}
                  </span>
                  <span className="relative flex-1 truncate text-sm text-white/85">
                    {c.label}
                  </span>
                  <span
                    className={
                      "relative rounded-full border px-1.5 py-px text-[9px] uppercase tracking-wide " +
                      (c.source === "user"
                        ? "border-emerald-400/20 text-emerald-300/70"
                        : "border-white/10 text-white/35")
                    }
                  >
                    {c.source}
                  </span>
                  <span className="relative font-mono text-xs tabular-nums text-white/70">
                    {c.count}
                  </span>
                </div>
              );
            })
          )
        ) : (
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// DISTRIBUTIONS (tools / volume / wants)
// =========================================================================

function DistributionCard({
  title,
  description,
  rows,
  total,
  accent = "white",
  ordered,
}: {
  title: string;
  description: string;
  rows: DistRow[] | null;
  total: number;
  accent?: Accent;
  ordered?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows ? (
          <ColumnChart
            rows={rows}
            total={total}
            accent={accent}
            ordered={ordered}
          />
        ) : (
          <ColumnChartSkeleton />
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// FREEFORM ANSWERS
// =========================================================================

// Avatar gradients keyed off a stable hash of the author so each card gets a
// consistent splash of colour without a per-row colour field in the payload.
const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
];

function hashIndex(seed: string, mod: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % mod;
}

function authorOf(r: FreeformRow) {
  const handle = r.twitter ? `@${r.twitter}` : null;
  const primary = handle ?? r.email;
  const secondary = handle ? r.email : null;
  const seed = r.twitter || r.email || "?";
  const initial =
    (r.twitter || r.email || "?").replace(/[^a-zA-Z0-9]/g, "").charAt(0).toUpperCase() ||
    "?";
  return { primary, secondary, initial, gradient: AVATAR_GRADIENTS[hashIndex(seed, AVATAR_GRADIENTS.length)] };
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/55">
      {children}
    </span>
  );
}

function FreeformCard({ rows }: { rows: FreeformRow[] | null }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Long-form answers</CardTitle>
          {rows && rows.length > 0 ? (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] tabular-nums text-white/55">
              {rows.length}
            </span>
          ) : null}
        </div>
        <CardDescription>
          Most recent 200 with usable text. Read these: quotable insight tends
          to live here, not in the multi-selects above.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows ? (
          rows.length === 0 ? (
            <p className="text-sm text-white/45">No long-form answers yet.</p>
          ) : (
            // CSS columns give a masonry feel so variable-length quotes pack
            // tightly instead of leaving ragged gaps in a fixed grid.
            <div className="gap-4 sm:columns-2 [&>*]:mb-4">
              {rows.map((r, i) => {
                const author = authorOf(r);
                return (
                  <figure
                    key={`${r.email}-${i}`}
                    className="group break-inside-avoid rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.045] to-white/[0.01] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg hover:shadow-black/30"
                  >
                    <div className="mb-3 flex items-center gap-2.5">
                      <div
                        className={
                          "flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-semibold text-white shadow-inner ring-1 ring-white/10 " +
                          author.gradient
                        }
                      >
                        {author.initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-white/90">
                          {author.primary}
                        </div>
                        {author.secondary ? (
                          <div className="truncate font-mono text-[10px] text-white/40">
                            {author.secondary}
                          </div>
                        ) : null}
                      </div>
                      {r.submittedAt ? (
                        <span className="shrink-0 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-white">
                          {formatShortDate(r.submittedAt)}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-medium text-white">
                          in progress
                        </span>
                      )}
                    </div>

                    <blockquote className="border-l-2 border-white/15 pl-3 text-[13.5px] leading-[1.6] text-white/85 transition-colors group-hover:border-white/30">
                      <p className="whitespace-pre-wrap">{r.freeform}</p>
                    </blockquote>

                    {r.country || r.volume || r.telegram ? (
                      <figcaption className="mt-3 flex flex-wrap gap-1.5">
                        {r.country ? <Chip>{r.country}</Chip> : null}
                        {r.volume ? <Chip>vol · {r.volume}</Chip> : null}
                        {r.telegram ? <Chip>tg · @{r.telegram}</Chip> : null}
                      </figcaption>
                    ) : null}
                  </figure>
                );
              })}
            </div>
          )
        ) : (
          <div className="gap-4 sm:columns-2 [&>*]:mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full break-inside-avoid rounded-xl" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
