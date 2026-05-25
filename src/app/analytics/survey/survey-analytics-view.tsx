"use client";

import { useEffect, useMemo, useState } from "react";
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

      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionCard
          title="Tools used today"
          description="Multi-select: sums exceed response count."
          rows={data?.distributions.tools ?? null}
          total={startedCount}
        />
        <DistributionCard
          title="Monthly trading volume"
          description="Single-select: totals to response count when answered."
          rows={data?.distributions.volume ?? null}
          total={
            data?.distributions.volume.reduce((s, r) => s + r.count, 0) ?? 0
          }
          ordered
        />
      </div>

      <DistributionCard
        title="What an AI agent should help with"
        description="Multi-select: sums exceed response count."
        rows={data?.distributions.wants ?? null}
        total={startedCount}
        wide
      />

      <FreeformCard rows={data?.freeform ?? null} />

      <p className="text-[11px] text-white/35">
        Top-of-funnel: {topOfFunnel} invites sent in this campaign
        {data ? ` · generated ${formatDateTime(data.generatedAt)} UTC` : ""}.
      </p>
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
      <CardContent className="space-y-2">
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
    <div className="flex flex-col gap-2">
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
          <div key={s.key} className="flex items-center gap-3">
            <div className="w-44 shrink-0 text-xs text-white/65">{s.label}</div>
            <div className="relative h-7 flex-1 overflow-hidden rounded-md border border-white/10 bg-black/40">
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 bg-indigo-400/35"
                style={{ width: `${widthPct}%` }}
              />
              <div className="relative flex h-full items-center px-2.5 text-[12px] font-medium text-white/90">
                <span className="tabular-nums">{s.count.toLocaleString()}</span>
                {prevPct ? (
                  <span className="ml-2 text-white/45">
                    · {prevPct} from prev
                  </span>
                ) : null}
                {fromSentPct ? (
                  <span className="ml-2 text-white/35">· {fromSentPct}</span>
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
      <CardContent className="space-y-2">
        {data ? (
          data.engagement.map((r) => {
            const widthPct =
              startedCount > 0
                ? Math.max(2, Math.round((r.count / startedCount) * 100))
                : 0;
            return (
              <div key={r.key} className="flex items-center gap-3">
                <div className="w-52 shrink-0 text-xs text-white/65">
                  {r.label}
                </div>
                <div className="relative h-6 flex-1 overflow-hidden rounded-md border border-white/10 bg-black/40">
                  <div
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-emerald-400/30"
                    style={{ width: `${widthPct}%` }}
                  />
                  <div className="relative flex h-full items-center px-2 text-[11.5px] font-medium text-white/85">
                    <span className="tabular-nums">{r.count}</span>
                    {startedCount > 0 ? (
                      <span className="ml-2 text-white/40">
                        · {pct(r.count, startedCount)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// COUNTRIES
// =========================================================================

function CountriesCard({ data }: { data: Payload | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Countries</CardTitle>
        <CardDescription>
          User-stated answer when available, otherwise IP-derived (ISO-2 code).
          Top 12 shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {data ? (
          data.countries.length === 0 ? (
            <p className="text-sm text-white/45">No country data yet.</p>
          ) : (
            data.countries.slice(0, 12).map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/85">
                  {c.label}
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-white/35">
                    {c.source === "user" ? "user" : "ip"}
                  </span>
                </span>
                <span className="font-mono text-xs tabular-nums text-white/70">
                  {c.count}
                </span>
              </div>
            ))
          )
        ) : (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
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
  wide,
  ordered,
}: {
  title: string;
  description: string;
  rows: DistRow[] | null;
  total: number;
  wide?: boolean;
  ordered?: boolean;
}) {
  return (
    <Card className={wide ? "lg:col-span-2" : undefined}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows ? (
          (ordered ? rows : [...rows].sort((a, b) => b.count - a.count)).map(
            (r) => {
              const widthPct =
                total > 0 ? Math.max(2, Math.round((r.count / total) * 100)) : 0;
              return (
                <div key={r.key} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 text-xs text-white/70">
                    {r.label}
                  </div>
                  <div className="relative h-5 flex-1 overflow-hidden rounded-md border border-white/10 bg-black/40">
                    <div
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-white/15"
                      style={{ width: `${widthPct}%` }}
                    />
                    <div className="relative flex h-full items-center px-2 text-[11px] tabular-nums text-white/80">
                      {r.count}
                      <span className="ml-2 text-white/35">
                        · {pct(r.count, total)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            },
          )
        ) : (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// FREEFORM ANSWERS
// =========================================================================

function FreeformCard({ rows }: { rows: FreeformRow[] | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Long-form answers</CardTitle>
        <CardDescription>
          Most recent 200 with usable text. Read these: quotable insight tends
          to live here, not in the multi-selects above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows ? (
          rows.length === 0 ? (
            <p className="text-sm text-white/45">No long-form answers yet.</p>
          ) : (
            rows.map((r, i) => (
              <div
                key={`${r.email}-${i}`}
                className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/55">
                  <span className="font-mono text-white/80">{r.email}</span>
                  {r.country ? <span>{r.country}</span> : null}
                  {r.twitter ? <span>@{r.twitter}</span> : null}
                  {r.telegram ? <span>tg: @{r.telegram}</span> : null}
                  {r.volume ? <span>vol: {r.volume}</span> : null}
                  {r.submittedAt ? (
                    <span className="ml-auto text-white/35">
                      submitted {formatDateTime(r.submittedAt)} UTC
                    </span>
                  ) : (
                    <span className="ml-auto text-amber-300/60">in progress</span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-[1.55] text-white/85">
                  {r.freeform}
                </p>
              </div>
            ))
          )
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        )}
      </CardContent>
    </Card>
  );
}
