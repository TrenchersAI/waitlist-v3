"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";

type FunnelStep = { key: string; label: string; count: number };
type WaveRow = {
  wave: string;
  label: string;
  total: number;
  granted: number;
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  activated: number;
};
type DayPoint = { date: string; sent: number };

type Payload = {
  campaign: string;
  funnel: FunnelStep[];
  waves: WaveRow[];
  timeline: DayPoint[];
  totals: {
    total: number;
    granted: number;
    sent: number;
    delivered: number;
    clicked: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
    activated: number;
    failed: number;
  };
  reputation: {
    bounceRate: number;
    complaintRate: number;
    bounceLimit: number;
    complaintLimit: number;
    webhookHealthy: boolean;
    emailEvents: number;
  };
  accessSource: "terminal" | "local";
  localGranted: number;
};

const fmt = new Intl.NumberFormat("en-US");

export function BetaAnalyticsContent() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/beta")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as Payload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Beta access</CardTitle>
          <CardDescription>Could not load: {error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="grid min-w-0 gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { totals, reputation } = data;

  return (
    <div className="grid min-w-0 gap-4">
      {/* The webhook warning sits above everything else on purpose. If it
          is not delivering, every rate below reads 0.00% because nothing
          ever gets recorded - which looks like a perfectly healthy send.
          That exact failure hid the true bounce rate of the 10,474-email
          survey campaign. */}
      {!reputation.webhookHealthy ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <strong className="font-semibold">
            Resend webhook is not recording events.
          </strong>{" "}
          Zero EmailEvent rows exist, so bounce and complaint counts below
          are floors, not measurements. Configure the webhook and
          RESEND_WEBHOOK_SECRET before trusting these numbers or starting
          another wave.
        </div>
      ) : null}

      {/* Where the access numbers come from matters. Reading the terminal's
          own login_whitelist is authoritative; falling back to our local
          accessGrantedAt column only proves the grant API returned 2xx. */}
      {data.accessSource === "local" ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
          Access and sign-in counts are from this app&apos;s own records, not
          the terminal. Set <code className="text-white/75">TRENCHERS_DATABASE_URL</code>{" "}
          to read <code className="text-white/75">login_whitelist</code> and{" "}
          <code className="text-white/75">users</code> directly.
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Prepared" value={totals.total} />
        <Stat
          label="Has beta access"
          value={totals.granted}
          hint={
            data.accessSource === "terminal"
              ? "live from login_whitelist"
              : "local record"
          }
        />
        <Stat label="Email sent" value={totals.sent} />
        <Stat
          label="Signed in to beta"
          value={totals.activated}
          hint={
            data.accessSource === "terminal" ? "live from users table" : undefined
          }
        />
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <RateCard
          label="Bounce rate"
          rate={reputation.bounceRate}
          limit={reputation.bounceLimit}
          count={totals.bounced}
          sent={totals.sent}
          healthy={reputation.webhookHealthy}
          note="Resend suspends above 4%"
        />
        <RateCard
          label="Complaint rate"
          rate={reputation.complaintRate}
          limit={reputation.complaintLimit}
          count={totals.complained}
          sent={totals.sent}
          healthy={reputation.webhookHealthy}
          note="Resend suspends above 0.08%"
          precision={3}
        />
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Delivery funnel</CardTitle>
          <CardDescription>
            Invited &rarr; provisioned &rarr; mailed &rarr; actually used it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-2">
          {data.funnel.map((step) => {
            const top = data.funnel[0]?.count ?? 0;
            const pct = top > 0 ? (step.count / top) * 100 : 0;
            return (
              <div key={step.key} className="min-w-0">
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-white/70">{step.label}</span>
                  <span className="tabular-nums text-white">
                    {fmt.format(step.count)}
                    <span className="ml-2 text-white/40">
                      {pct.toFixed(1)}%
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-white/70"
                    style={{ width: `${Math.max(pct, 0.5)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Rollout by wave</CardTitle>
          <CardDescription>
            Waves are graded by how likely the recipient is to be a real,
            engaged human. They are sent best-first so a problem shows up
            while the audience is still small.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/50">
                <th className="py-2 pr-3 font-medium">Wave</th>
                <th className="py-2 pr-3 text-right font-medium">Total</th>
                <th className="py-2 pr-3 text-right font-medium">Granted</th>
                <th className="py-2 pr-3 text-right font-medium">Sent</th>
                <th className="py-2 pr-3 text-right font-medium">Bounced</th>
                <th className="py-2 pr-3 text-right font-medium">Spam</th>
                <th className="py-2 pr-3 text-right font-medium">Unsub</th>
                <th className="py-2 text-right font-medium">Signed in</th>
              </tr>
            </thead>
            <tbody>
              {data.waves.map((w) => (
                <tr key={w.wave} className="border-b border-white/5">
                  <td className="py-2 pr-3">
                    <div className="text-white">{w.label}</div>
                    <div className="text-xs text-white/40">{w.wave}</div>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-white/80">
                    {fmt.format(w.total)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-white/80">
                    {fmt.format(w.granted)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-white/80">
                    {fmt.format(w.sent)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-white/80">
                    {fmt.format(w.bounced)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-white/80">
                    {fmt.format(w.complained)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-white/80">
                    {fmt.format(w.unsubscribed)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-white">
                    {fmt.format(w.activated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {data.timeline.length > 0 ? (
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Daily send volume</CardTitle>
            <CardDescription>
              Keep each day under 5,000 to Gmail so the bulk-sender
              thresholds stay comfortable.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="grid gap-1.5">
              {data.timeline.map((d) => {
                const max = Math.max(...data.timeline.map((x) => x.sent), 1);
                return (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs tabular-nums text-white/50">
                      {d.date}
                    </span>
                    <div className="h-4 min-w-0 flex-1 overflow-hidden rounded bg-white/[0.06]">
                      <div
                        className="h-full rounded bg-white/70"
                        style={{ width: `${(d.sent / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs tabular-nums text-white/70">
                      {fmt.format(d.sent)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-white/45">
          {label}
        </div>
        <div className="mt-1 text-2xl tabular-nums text-white">
          {fmt.format(value)}
        </div>
        {hint ? (
          <div className="mt-0.5 text-[11px] text-white/35">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RateCard({
  label,
  rate,
  limit,
  count,
  sent,
  healthy,
  note,
  precision = 2,
}: {
  label: string;
  rate: number;
  limit: number;
  count: number;
  sent: number;
  healthy: boolean;
  note: string;
  precision?: number;
}): ReactNode {
  const pctOfLimit = limit > 0 ? (rate / limit) * 100 : 0;
  const danger = rate >= limit;
  const warn = !danger && pctOfLimit >= 50;
  const tone = !healthy
    ? "text-white/40"
    : danger
      ? "text-red-300"
      : warn
        ? "text-amber-300"
        : "text-emerald-300";

  return (
    <Card className="min-w-0">
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-xs uppercase tracking-wide text-white/45">
            {label}
          </div>
          <div className="text-xs text-white/35">{note}</div>
        </div>
        <div className={`mt-1 text-2xl tabular-nums ${tone}`}>
          {healthy ? `${(rate * 100).toFixed(precision)}%` : "unmeasured"}
        </div>
        <div className="mt-1 text-xs text-white/40">
          {fmt.format(count)} of {fmt.format(sent)} sent
          {healthy ? ` · ${pctOfLimit.toFixed(0)}% of the limit` : ""}
        </div>
      </CardContent>
    </Card>
  );
}
