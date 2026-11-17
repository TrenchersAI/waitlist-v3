"use client";

// Daily Review (TRE-10014): last 24 h of manual trading and platform health.
// Data: `/api/analytics/daily-review` (server-side; the st-api token never
// reaches the browser). Anything the server could not read arrives as
// `state: "not_measured"` and renders as "not measured", never as 0.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

import { StatCard } from "@/src/app/analytics/trading-analytics-view";
import { Skeleton } from "@/src/components/ui/skeleton";
import {
  HEALTH_GROUPS,
  NOT_MEASURED,
  formatMs,
  formatNumber,
  healthGroupOf,
  pointTimeMs,
  seriesStats,
  solscanTxUrl,
  type DailyReview,
  type HealthSeries,
  type HourBucket,
  type TradesSection,
} from "@/src/lib/daily-review-summary";
import { deskProfileUrl } from "@/src/lib/ops-desk";
import { cn } from "@/src/lib/utils";

const OUTCOMES: ReadonlyArray<{
  key: keyof Omit<HourBucket, "hour">;
  label: string;
  color: string;
}> = [
  { key: "success", label: "Success", color: "#34d399" },
  { key: "failed", label: "Failed", color: "#f87171" },
  { key: "unknown", label: "Unknown", color: "#fbbf24" },
  { key: "pending", label: "In flight", color: "#94a3b8" },
];

function Card({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {sub ? <p className="text-xs text-white/45">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

function NotMeasured({ reason }: { reason?: string }) {
  return (
    <p className="text-sm text-white/50">
      {NOT_MEASURED}
      {reason ? <span className="text-white/35"> ({reason})</span> : null}
    </p>
  );
}

function fmtTime(iso: string): string {
  return `${iso.slice(11, 16)} UTC`;
}

// --- manual trades -----------------------------------------------------------

function HourlyChart({ hours }: { hours: HourBucket[] }) {
  const max = Math.max(
    1,
    ...hours.map((h) => h.success + h.failed + h.unknown + h.pending),
  );
  return (
    <div>
      <div className="flex h-40 items-end gap-[3px]" role="img" aria-label="Manual trades per hour by outcome">
        {hours.map((h) => {
          const total = h.success + h.failed + h.unknown + h.pending;
          const title = `${fmtTime(h.hour)}: ${OUTCOMES.map((o) => `${o.label} ${h[o.key]}`).join(", ")}`;
          return (
            <div
              key={h.hour}
              title={title}
              className="flex h-full min-w-0 flex-1 flex-col-reverse"
            >
              {total === 0 ? (
                <div className="h-px w-full bg-white/10" />
              ) : (
                OUTCOMES.map((o) =>
                  h[o.key] > 0 ? (
                    <div
                      key={o.key}
                      style={{
                        height: `${(h[o.key] / max) * 100}%`,
                        background: o.color,
                      }}
                      className="w-full first:rounded-b-sm last:rounded-t-sm"
                    />
                  ) : null,
                )
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-white/40 tabular-nums">
        <span>{hours[0] ? fmtTime(hours[0].hour) : ""}</span>
        <span>{hours.at(-1) ? fmtTime(hours.at(-1)!.hour) : ""}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/55">
        {OUTCOMES.map((o) => (
          <span key={o.key} className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ background: o.color }} aria-hidden />
            {o.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function HBarList({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2 text-xs">
          <div className="relative h-6 overflow-hidden rounded bg-white/[0.03]">
            <div
              className="absolute inset-y-0 left-0 bg-red-400/30"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
            <span className="relative z-10 block truncate px-2 leading-6 text-white/80">{r.label}</span>
          </div>
          <span className="text-right tabular-nums text-white">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function TradeSections({ trades, loading }: { trades: TradesSection | null; loading: boolean }) {
  if (!loading && trades?.state === "not_measured") {
    return (
      <Card title="Manual trades">
        <NotMeasured reason={trades.reason} />
      </Card>
    );
  }
  const ok = trades?.state === "ok" ? trades : null;
  const t = ok?.totals;
  const finished = t ? t.success + t.failed + t.unknown : 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatCard label="Manual trades" loading={loading} value={t ? formatNumber(finished + t.pending) : ""} />
        <StatCard label="Success" dotColor={OUTCOMES[0].color} loading={loading} value={t ? formatNumber(t.success) : ""}
          sub={t && finished > 0 ? `${((t.success / finished) * 100).toFixed(1)}%` : undefined} />
        <StatCard label="Failed" dotColor={OUTCOMES[1].color} loading={loading} value={t ? formatNumber(t.failed) : ""}
          sub={t ? `${t.rejectedAttempts} rejected before send` : undefined} />
        <StatCard label="Unknown outcome" dotColor={OUTCOMES[2].color} loading={loading} value={t ? formatNumber(t.unknown) : ""} />
        <StatCard label="In flight" dotColor={OUTCOMES[3].color} loading={loading} value={t ? formatNumber(t.pending) : ""} />
      </div>

      <Card title="Manual trades by hour" sub="execution_request, bot_id IS NULL, stacked by outcome">
        {ok ? <HourlyChart hours={ok.byHour} /> : <Skeleton className="h-44 w-full" />}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Failures by reason" sub="last recorded error per failed or unknown trade">
          {!ok ? (
            <Skeleton className="h-32 w-full" />
          ) : ok.reasons.length === 0 ? (
            <p className="text-sm text-white/50">No failed or unknown trades in the last 24 h.</p>
          ) : (
            <HBarList rows={ok.reasons.map((r) => ({ label: r.reason, value: r.count }))} />
          )}
        </Card>

        <Card title="Stage latency" sub="exec_attempt stage timings, p50 / p95">
          {!ok ? (
            <Skeleton className="h-32 w-full" />
          ) : ok.latency.length === 0 ? (
            <NotMeasured reason="no timed attempts in the window" />
          ) : (
            <table className="w-full text-xs">
              <thead className="text-white/45">
                <tr>
                  <th className="py-1 text-left font-medium">Stage</th>
                  <th className="py-1 text-right font-medium">p50</th>
                  <th className="py-1 text-right font-medium">p95</th>
                  <th className="py-1 text-right font-medium">Samples</th>
                </tr>
              </thead>
              <tbody className="tabular-nums text-white/85">
                {ok.latency.map((s) => (
                  <tr key={s.stage} className="border-t border-white/5">
                    <td className="py-1">{s.stage}</td>
                    <td className="py-1 text-right">{formatMs(s.p50Ms)}</td>
                    <td className="py-1 text-right">{formatMs(s.p95Ms)}</td>
                    <td className="py-1 text-right text-white/50">{s.samples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card
        title="Failed and unknown trades"
        sub={ok?.failedTradesTruncated ? "newest 500 shown" : undefined}
      >
        {!ok ? (
          <Skeleton className="h-32 w-full" />
        ) : ok.failedTrades.length === 0 ? (
          <p className="text-sm text-white/50">None in the last 24 h.</p>
        ) : (
          <div className="overflow-x-auto scrollbar-minimal-black">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="text-white/45">
                <tr>
                  <th className="py-1.5 text-left font-medium">Time</th>
                  <th className="py-1.5 text-left font-medium">User</th>
                  <th className="py-1.5 text-left font-medium">Side</th>
                  <th className="py-1.5 text-left font-medium">Outcome</th>
                  <th className="py-1.5 text-left font-medium">Reason</th>
                  <th className="py-1.5 text-left font-medium">Detail</th>
                  <th className="py-1.5 text-left font-medium">Signature</th>
                </tr>
              </thead>
              <tbody className="text-white/85">
                {ok.failedTrades.map((f, i) => (
                  <tr key={`${f.at}-${f.userId}-${i}`} className="border-t border-white/5 align-top">
                    <td className="py-1.5 pr-2 tabular-nums whitespace-nowrap">{fmtTime(f.at)}</td>
                    <td className="py-1.5 pr-2 font-mono">
                      <a href={deskProfileUrl(f.userId)} target="_blank" rel="noreferrer" className="hover:underline">
                        {f.userId.slice(0, 8)}
                      </a>
                    </td>
                    <td className="py-1.5 pr-2">{f.side}</td>
                    <td className={cn("py-1.5 pr-2", f.status === "unknown" ? "text-amber-300" : "text-red-300")}>
                      {f.status}
                    </td>
                    <td className="py-1.5 pr-2">{f.reason}</td>
                    <td className="max-w-[260px] py-1.5 pr-2 break-words text-white/60">{f.detail ?? ""}</td>
                    <td className="py-1.5 font-mono">
                      {f.signature ? (
                        <a
                          href={solscanTxUrl(f.signature)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          {f.signature.slice(0, 8)}
                          <ExternalLink className="size-3" aria-hidden />
                        </a>
                      ) : (
                        <span className="text-white/35">none</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

// --- health -------------------------------------------------------------------

function Sparkline({ series }: { series: HealthSeries }) {
  const pts = useMemo(
    () => [...series.points].sort((a, b) => a[0] - b[0]),
    [series.points],
  );
  if (pts.length < 2) return null;
  const t0 = pointTimeMs(pts[0][0]);
  const t1 = pointTimeMs(pts[pts.length - 1][0]);
  const vs = pts.map((p) => p[1]);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const d = pts
    .map((p, i) => {
      const x = t1 > t0 ? ((pointTimeMs(p[0]) - t0) / (t1 - t0)) * 100 : 0;
      const y = hi > lo ? 28 - ((p[1] - lo) / (hi - lo)) * 26 : 15;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <path d={d} fill="none" stroke="#a5b4fc" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function HealthSections({ review, loading }: { review: DailyReview | null; loading: boolean }) {
  const health = review?.health;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {HEALTH_GROUPS.map(({ id, label }) => {
        const series =
          health?.state === "ok"
            ? health.series.filter((s) => healthGroupOf(s.name) === id)
            : [];
        return (
          <Card key={id} title={label} sub={health?.state === "ok" ? "st-api daily-review metrics" : undefined}>
            {loading || !health ? (
              <Skeleton className="h-24 w-full" />
            ) : health.state === "not_measured" ? (
              <NotMeasured reason={health.reason} />
            ) : series.length === 0 ? (
              <NotMeasured reason="no series reported" />
            ) : (
              <ul className="flex flex-col gap-3">
                {series.map((s) => {
                  const st = seriesStats(s);
                  const unit = s.unit ? ` ${s.unit}` : "";
                  return (
                    <li key={s.name}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                        <span className="font-mono text-white/75">{s.name}</span>
                        {st ? (
                          <span className="tabular-nums text-white/55">
                            latest <span className="text-white">{formatNumber(st.latest)}{unit}</span>
                            {" , max "}
                            <span className="text-white">{formatNumber(st.max)}{unit}</span>
                          </span>
                        ) : (
                          <span className="text-white/45">{NOT_MEASURED}</span>
                        )}
                      </div>
                      <Sparkline series={s} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// --- container ---------------------------------------------------------------

export function DailyReviewContent() {
  const [data, setData] = useState<DailyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/daily-review", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as DailyReview;
      })
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setError(null);
        }
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
  }, [nonce]);

  const refresh = useCallback(() => {
    setLoading(true);
    setNonce((n) => n + 1);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-white/50">
          {data
            ? `Window ${data.windowStart.slice(0, 16).replace("T", " ")} to ${data.windowEnd.slice(0, 16).replace("T", " ")} UTC. Manual trades only (bot_id IS NULL).`
            : "Last 24 h, manual trades only."}
        </p>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
          Could not load the daily review ({error}). Nothing below is a measurement.
        </div>
      ) : (
        <>
          <TradeSections trades={data?.trades ?? null} loading={loading && !data} />
          <h2 className="pt-2 text-xs font-semibold tracking-[0.14em] text-white/45 uppercase">
            Health
          </h2>
          <HealthSections review={data} loading={loading && !data} />
        </>
      )}
    </div>
  );
}
