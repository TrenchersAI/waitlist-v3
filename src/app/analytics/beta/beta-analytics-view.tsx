"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Skeleton } from "@/src/components/ui/skeleton";

import {
  BAD,
  Breakdown,
  CadenceBars,
  Funnel,
  MiniBar,
  OK,
  RateGauge,
  Timeline,
  WATCH,
  toneFor,
} from "./beta-charts";

type FunnelStep = { key: string; label: string; count: number; note: string };
type WaveRow = {
  wave: string;
  label: string;
  total: number;
  granted: number;
  sent: number;
  pending: number;
  delivered: number;
  opened: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  failed: number;
  suppressed: number;
  activated: number;
  activatedAfterSend: number;
  activatedBeforeSend: number;
  deliveryRate: number;
  bounceRate: number;
  complaintRate: number;
  activationRate: number;
};
type TrenchReport = {
  wave: string;
  name: string;
  waveLabel: string;
  subject: string;
  cohort: number;
  target: number;
  heldBack: number;
  granted: number;
  sent: number;
  remaining: number;
  batchSize: number;
  batchesTotal: number;
  batchesDone: number;
  startedAt: string | null;
  lastSentAt: string | null;
  etaAt: string | null;
  delivered: number;
  opened: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  suppressed: number;
  failed: number;
  activated: number;
  activatedBeforeSend: number;
  cohortActivated: number;
  deliveryRate: number;
  bounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
  activationRate: number;
  openTracked: boolean;
  cadence: { bucket: string; sent: number; delivered: number; bounced: number }[];
  domains: DomainRow[];
  previous: {
    wave: string;
    name: string;
    sent: number;
    delivered: number;
    bounced: number;
    complained: number;
    activated: number;
    deliveryRate: number;
    bounceRate: number;
    activationRate: number;
  };
};

type SeriesPoint = {
  bucket: string;
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
};
type DomainRow = {
  domain: string;
  total: number;
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  activated: number;
};
type EventRow = {
  type: string;
  email: string | null;
  occurredAt: string;
  detail: string | null;
};

type Payload = {
  campaign: string;
  generatedAt: string;
  funnel: FunnelStep[];
  waves: WaveRow[];
  trench: TrenchReport;
  series: SeriesPoint[];
  domains: DomainRow[];
  recentEvents: EventRow[];
  eventTypes: { type: string; count: number }[];
  bounceReasons: { reason: string; count: number }[];
  totals: {
    total: number;
    granted: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
    failed: number;
    activated: number;
    activatedBeforeSend: number;
    pending: number;
  };
  reputation: {
    bounceRate: number;
    complaintRate: number;
    deliveryRate: number;
    unsubscribeRate: number;
    activationRate: number;
    bounceLimit: number;
    complaintLimit: number;
    bouncePause: number;
    complaintPause: number;
    webhookHealthy: boolean;
    totalEvents: number;
  };
  sends: {
    key: string;
    label: string;
    audience: string;
    sent: number;
    delivered: number;
    opened: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
    openTracked: boolean;
  }[];
  openTrackingEverUsed: boolean;
  reminder: {
    sent: number;
    delivered: number;
    opened: number;
    bounced: number;
    complained: number;
    pending: number;
    recovered: number;
    deliveryRate: number;
    bounceRate: number;
    complaintRate: number;
    recoveryRate: number;
    bounceLimit: number;
    complaintLimit: number;
    bouncePause: number;
    complaintPause: number;
  };
  tracking: { opens: boolean; clicks: boolean };
  accessSource: "terminal" | "local";
};

const nf = new Intl.NumberFormat("en-US");
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;

export function BetaAnalyticsContent() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Initial fetch. Kept as a plain effect with a cancelled flag, matching
  // the survey tab, so no state is set synchronously during the effect.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/beta", { cache: "no-store" })
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

  // Manual refresh, driven by a click rather than an effect.
  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/analytics/beta", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as Payload);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (error) {
    return (
      <Panel title="Beta access">
        <p className="text-sm text-white/50">Could not load: {error}</p>
      </Panel>
    );
  }
  if (!data) {
    return (
      <div className="grid min-w-0 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const { totals: t, reputation: r } = data;
  const notStarted = t.sent === 0;

  return (
    <div className="grid min-w-0 gap-4">
      {/* Health banners come first. A dashboard that reports 0.00% because
          nothing is being recorded looks identical to a healthy one, so the
          instrument's own status outranks the numbers it produces. */}
      {!r.webhookHealthy ? (
        <Banner tone="bad" title="Resend webhook is not recording">
          Zero events have ever arrived, so every delivery number below is a
          floor rather than a measurement, and the send script&apos;s abort
          gates cannot fire. Point the webhook at{" "}
          <code className="text-white/80">
            www.trenchers.ai/api/webhooks/resend
          </code>{" "}
          and set <code className="text-white/80">RESEND_WEBHOOK_SECRET</code>.
        </Banner>
      ) : (
        <Banner tone="ok" title="Live instrumentation">
          {nf.format(r.totalEvents)} webhook events recorded. Bounce and
          complaint gating is active on the sender.
        </Banner>
      )}

      {data.accessSource === "local" ? (
        <Banner tone="watch" title="Access figures are unverified">
          Reading this app&apos;s own records rather than the terminal. Set{" "}
          <code className="text-white/80">TRENCHERS_DATABASE_URL</code> to
          report who can genuinely sign in.
        </Banner>
      ) : null}

      {/* KPI strip */}
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Prepared" value={t.total} sub="graded as mailable" />
        <Kpi
          label="Has beta access"
          value={t.granted}
          sub={
            data.accessSource === "terminal"
              ? "live from login_whitelist"
              : "local record"
          }
          share={t.total > 0 ? t.granted / t.total : 0}
        />
        <Kpi
          label="Email sent"
          value={t.sent}
          sub={`${nf.format(t.pending)} still queued`}
          share={t.total > 0 ? t.sent / t.total : 0}
        />
        <Kpi
          label="Delivered"
          value={t.delivered}
          sub={t.sent > 0 ? `${pct(r.deliveryRate)} of sent` : "awaiting send"}
          share={t.sent > 0 ? r.deliveryRate : 0}
          tone={t.sent > 0 && r.deliveryRate < 0.95 ? WATCH : undefined}
        />
        <Kpi
          label="Signed in after"
          value={t.activated}
          sub={
            t.delivered > 0
              ? `${pct(r.activationRate)} of delivered, ${nf.format(t.activatedBeforeSend)} were already users`
              : "the number that matters"
          }
          share={t.delivered > 0 ? r.activationRate : 0}
          tone={OK}
        />
      </div>

      {/* The rollout in flight. This leads the page while a send is live,
          because campaign-wide totals are dominated by earlier waves and a
          problem in today's send is invisible inside them. */}
      <TrenchPanel trench={data.trench} webhookHealthy={r.webhookHealthy} />

      {/* Reputation gauges */}
      <Panel
        title="Sender reputation"
        hint="Thresholds are Resend's own, which bind tighter than Gmail's 0.30%"
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <RateGauge
            label="Bounce rate"
            rate={r.bounceRate}
            pause={r.bouncePause}
            limit={r.bounceLimit}
            count={t.bounced}
            denom={t.sent}
            measured={r.webhookHealthy && t.sent > 0}
          />
          <RateGauge
            label="Complaint rate"
            rate={r.complaintRate}
            pause={r.complaintPause}
            limit={r.complaintLimit}
            count={t.complained}
            denom={t.sent}
            precision={3}
            measured={r.webhookHealthy && t.sent > 0}
          />
          <Stat
            label="Unsubscribes"
            value={t.unsubscribed}
            caption={t.sent > 0 ? `${pct(r.unsubscribeRate, 2)} of sent` : "none yet"}
          />
          <Stat
            label="Hard failures"
            value={t.failed}
            caption="rejected by Resend at send time"
            tone={t.failed > 0 ? BAD : undefined}
          />
        </div>
      </Panel>

      {/* Funnel + timeline */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <Panel title="Delivery funnel" hint="Hover a stage for what it measures">
          <Funnel steps={data.funnel} />
        </Panel>
        <Panel
          title="Send timeline"
          hint="Hourly, UTC. Keep any single day under 5,000 to Gmail."
        >
          <Timeline points={data.series} />
        </Panel>
      </div>

      {/* Per-send comparison */}
      <Panel
        title="Email performance by send"
        hint="Each message on its own terms. Blending three audiences into one rate would describe none of them."
      >
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/40">
                <th className="py-2 pr-3 font-medium">Send</th>
                <th className="py-2 pr-3 text-right font-medium">Sent</th>
                <th className="py-2 pr-3 text-right font-medium">Delivered</th>
                <th className="py-2 pr-3 text-right font-medium">Opened</th>
                <th className="py-2 pr-3 text-right font-medium">Bounced</th>
                <th className="py-2 pr-3 text-right font-medium">Spam</th>
                <th className="py-2 text-right font-medium">Unsub</th>
              </tr>
            </thead>
            <tbody>
              {data.sends.map((s) => (
                <tr key={s.key} className="border-b border-white/5 last:border-0">
                  <td className="py-2.5 pr-3">
                    <div className="text-white">{s.label}</div>
                    <div className="text-[11px] text-white/35">{s.audience}</div>
                  </td>
                  <Num v={s.sent} dim={s.sent === 0} />
                  <td className="py-2.5 pr-3 text-right tabular-nums text-white/85">
                    {nf.format(s.delivered)}
                    {s.sent > 0 ? (
                      <span className="ml-1.5 text-[11px] text-white/35">
                        {pct(s.delivered / s.sent, 0)}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    {s.openTracked ? (
                      <span className="tabular-nums text-white">
                        {nf.format(s.opened)}
                        {s.delivered > 0 ? (
                          <span className="ml-1.5 text-[11px] text-white/35">
                            {pct(s.opened / s.delivered, 0)}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-[11px] text-white/25">not tracked</span>
                    )}
                  </td>
                  <Num v={s.bounced} tone={s.bounced > 0 ? BAD : undefined} dim={s.bounced === 0} />
                  <Num v={s.complained} tone={s.complained > 0 ? BAD : undefined} dim={s.complained === 0} />
                  <Num v={s.unsubscribed} dim={s.unsubscribed === 0} last />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!data.openTrackingEverUsed ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[12px] leading-relaxed text-white/50">
            <strong className="text-white/75">Opens are not being measured.</strong>{" "}
            Open tracking is off on every send so far, so the column reads
            &quot;not tracked&quot; rather than zero. It works by embedding a 1x1
            pixel, which is a recognisable bulk-marketing signal, and the number
            it produces is inflated by Apple Mail Privacy Protection prefetching
            images without a human reading anything. Pass{" "}
            <code className="text-white/75">--track-opens</code> to any sender to
            enable it for that run, and this column fills in from the next send
            onward. It cannot be backfilled for messages already delivered.
          </div>
        ) : null}
      </Panel>

      {/* Second send */}
      <Panel
        title="Signup issue mail"
        hint="Second send, to invitees who had not signed in. Tracked separately from the invite."
      >
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
            <Mini label="Sent" value={data.reminder.sent} />
            <Mini
              label="Delivered"
              value={data.reminder.delivered}
              caption={
                data.reminder.sent > 0
                  ? pct(data.reminder.deliveryRate)
                  : "awaiting send"
              }
            />
            <Mini label="Still queued" value={data.reminder.pending} />
            <Mini
              label="Bounced"
              value={data.reminder.bounced}
              caption={data.reminder.sent > 0 ? pct(data.reminder.bounceRate) : undefined}
              tone={data.reminder.bounced > 0 ? BAD : undefined}
            />
            <Mini
              label="Spam reports"
              value={data.reminder.complained}
              caption={
                data.reminder.sent > 0 ? pct(data.reminder.complaintRate, 3) : undefined
              }
              tone={data.reminder.complained > 0 ? BAD : undefined}
            />
            <Mini
              label="Recovered"
              value={data.reminder.recovered}
              caption={
                data.reminder.sent > 0 ? pct(data.reminder.recoveryRate) : undefined
              }
              tone={data.reminder.recovered > 0 ? OK : undefined}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <RateGauge
              label="Bounce rate"
              rate={data.reminder.bounceRate}
              pause={data.reminder.bouncePause}
              limit={data.reminder.bounceLimit}
              count={data.reminder.bounced}
              denom={data.reminder.sent}
              measured={r.webhookHealthy && data.reminder.sent > 0}
            />
            <RateGauge
              label="Complaint rate"
              rate={data.reminder.complaintRate}
              pause={data.reminder.complaintPause}
              limit={data.reminder.complaintLimit}
              count={data.reminder.complained}
              denom={data.reminder.sent}
              precision={3}
              measured={r.webhookHealthy && data.reminder.sent > 0}
            />
          </div>
        </div>

        <p className="mt-4 border-t border-white/5 pt-3 text-[12px] leading-relaxed text-white/45">
          <strong className="text-white/70">Recovered</strong> counts people who
          had not signed in when this went out and have since. It is the only
          number that says whether the send was worth making. Audience is
          recomputed at send time from the terminal, so anyone who signs in
          before their batch is dropped rather than being told their account is
          still waiting.
        </p>
      </Panel>

      {/* Waves: the full per-cohort report */}
      <Panel
        title="Rollout by wave"
        hint="Each cohort on its own terms. Waves are graded by how likely the recipient is to be real and engaged, and mailed best-first."
      >
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/40">
                <th className="py-2 pr-3 font-medium">Wave</th>
                <th className="py-2 pr-3 font-medium">Progress</th>
                <th className="py-2 pr-3 text-right font-medium">Total</th>
                <th className="py-2 pr-3 text-right font-medium">Access</th>
                <th className="py-2 pr-3 text-right font-medium">Sent</th>
                <th className="py-2 pr-3 text-right font-medium">Queued</th>
                <th className="py-2 pr-3 font-medium">Delivered</th>
                <th className="py-2 pr-3 text-right font-medium">Bounced</th>
                <th className="py-2 pr-3 text-right font-medium">Spam</th>
                <th className="py-2 pr-3 text-right font-medium">Unsub</th>
                <th className="py-2 pr-3 font-medium">Signed in after</th>
              </tr>
            </thead>
            <tbody>
              {data.waves.map((w) => {
                const progress = w.total > 0 ? w.sent / w.total : 0;
                const live = w.pending > 0 && w.sent > 0;
                return (
                  <tr key={w.wave} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{w.label}</span>
                        {live ? (
                          <span className="rounded border border-emerald-400/30 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                            sending
                          </span>
                        ) : null}
                      </div>
                      <div className="font-mono text-[10px] text-white/35">{w.wave}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <MiniBar
                          value={progress}
                          tone={progress === 0 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.8)"}
                        />
                        <span className="text-[11px] tabular-nums text-white/40">
                          {progress === 0 ? "not started" : pct(progress, 0)}
                        </span>
                      </div>
                    </td>
                    <Num v={w.total} />
                    <Num v={w.granted} dim={w.granted === 0} />
                    <Num v={w.sent} dim={w.sent === 0} />
                    <Num v={w.pending} dim={w.pending === 0} />
                    <td className="py-2.5 pr-3">
                      {w.sent > 0 ? (
                        <div className="flex items-center gap-2">
                          <MiniBar
                            value={w.deliveryRate}
                            tone={w.deliveryRate < 0.9 ? WATCH : OK}
                          />
                          <span className="text-[11px] tabular-nums text-white/60">
                            {nf.format(w.delivered)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-white/25">not sent</span>
                      )}
                    </td>
                    <Num
                      v={w.bounced}
                      tone={w.bounced > 0 ? toneFor(w.bounceRate, 0.02, 0.04) : undefined}
                      dim={w.bounced === 0}
                    />
                    <Num v={w.complained} tone={w.complained > 0 ? BAD : undefined} dim={w.complained === 0} />
                    <Num v={w.unsubscribed} dim={w.unsubscribed === 0} />
                    <td className="py-2.5 text-right">
                      {w.delivered > 0 ? (
                        <span className="tabular-nums" style={{ color: OK }}>
                          {nf.format(w.activatedAfterSend)}
                          <span className="ml-1.5 text-[11px] text-white/35">
                            {pct(w.activationRate, 0)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-white/25">
                          {w.activated > 0
                            ? `${nf.format(w.activated)} already users`
                            : "n/a"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 border-t border-white/5 pt-3 text-[12px] leading-relaxed text-white/45">
          <strong className="text-white/70">Signed in after</strong> counts only
          people whose terminal account was created at or after we mailed them,
          as a percentage of delivered. Both halves of that matter: plenty of
          waitlist signups already had an account, and someone who never
          received the email cannot have signed in because of it. Counting
          every account in the cohort would let a wave claim users it never
          brought in. <strong className="text-white/70">Queued</strong> is the
          remainder of a cohort that has not been mailed yet, which is how a
          partial rollout stays visible rather than looking finished.
        </p>
      </Panel>

      {/* Domains + engagement */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel
          title="Delivery by mailbox provider"
          hint="82% of this list is Gmail, so Gmail's numbers are effectively the campaign's numbers"
        >
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/40">
                  <th className="py-2 pr-3 font-medium">Domain</th>
                  <th className="py-2 pr-3 text-right font-medium">Recipients</th>
                  <th className="py-2 pr-3 text-right font-medium">Sent</th>
                  <th className="py-2 pr-3 font-medium">Delivery</th>
                  <th className="py-2 pr-3 text-right font-medium">Bounced</th>
                  <th className="py-2 text-right font-medium">Signed in</th>
                </tr>
              </thead>
              <tbody>
                {data.domains.map((d) => {
                  const dRate = d.sent > 0 ? d.delivered / d.sent : 0;
                  return (
                    <tr key={d.domain} className="border-b border-white/5 last:border-0">
                      <td className="py-2.5 pr-3 font-mono text-[12px] text-white/85">
                        {d.domain}
                      </td>
                      <Num v={d.total} />
                      <Num v={d.sent} dim={d.sent === 0} />
                      <td className="py-2.5 pr-3">
                        {d.sent > 0 ? (
                          <div className="flex items-center gap-2">
                            <MiniBar value={dRate} tone={dRate < 0.9 ? WATCH : OK} />
                            <span className="text-[11px] tabular-nums text-white/50">
                              {pct(dRate, 0)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-white/25">not sent</span>
                        )}
                      </td>
                      <Num v={d.bounced} tone={d.bounced > 0 ? BAD : undefined} dim={d.bounced === 0} />
                      <Num v={d.activated} tone={d.activated > 0 ? OK : undefined} dim={d.activated === 0} last />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid min-w-0 gap-4">
          <Panel title="Engagement tracking" hint="Deliberately switched off">
            <div className="flex flex-col gap-3">
              <TrackingRow
                label="Opens"
                enabled={data.tracking.opens}
                value={data.totals.opened}
                why="The 1x1 pixel is a bulk-marketing signal, and Apple Mail Privacy Protection inflates the count into noise."
              />
              <TrackingRow
                label="Clicks"
                enabled={data.tracking.clicks}
                value={data.totals.clicked}
                why="Click tracking rewrites every link through a Resend domain shared with other senders, inheriting their reputation."
              />
              <p className="border-t border-white/5 pt-3 text-[12px] leading-relaxed text-white/45">
                We measure the stronger signal instead: <strong className="text-white/70">Signed in</strong> counts
                people who actually reached the terminal and authenticated, read
                from its own users table. That is a real conversion, not a proxy
                for one.
              </p>
            </div>
          </Panel>

          <Panel title="Bounce reasons">
            <Breakdown
              rows={data.bounceReasons.map((b) => ({ label: b.reason, count: b.count }))}
              tone={BAD}
              empty={notStarted ? "Nothing sent yet." : "No bounces recorded."}
            />
          </Panel>
        </div>
      </div>

      {/* Event stream */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Panel title="Event mix" hint="Everything Resend has told us">
          <Breakdown
            rows={data.eventTypes.map((e) => ({
              label: e.type.replace("email.", ""),
              count: e.count,
            }))}
            empty="No webhook events yet."
          />
        </Panel>

        <Panel title="Live event stream" hint="Most recent 40, newest first">
          {data.recentEvents.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/30">
              Nothing yet. Events appear here within a second of Resend sending them.
            </div>
          ) : (
            <div className="max-h-[320px] min-w-0 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {data.recentEvents.map((e, i) => (
                    <tr key={`${e.occurredAt}-${i}`} className="border-b border-white/5 last:border-0">
                      <td className="py-2 pr-3 align-top">
                        <EventChip type={e.type} />
                      </td>
                      <td className="py-2 pr-3 align-top font-mono text-[11px] text-white/65">
                        <span className="break-all">{e.email ?? "unknown"}</span>
                        {e.detail ? (
                          <span className="ml-2 text-rose-300/70">{e.detail}</span>
                        ) : null}
                      </td>
                      <td className="py-2 text-right align-top font-mono text-[11px] tabular-nums text-white/35">
                        {new Date(e.occurredAt).toISOString().slice(5, 16).replace("T", " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <p className="text-[11px] text-white/25">
        Campaign {data.campaign} &middot; generated{" "}
        {new Date(data.generatedAt).toISOString().slice(0, 19).replace("T", " ")} UTC
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

/// Focused report on the rollout currently going out.
///
/// Everything here is scoped to one wave. Reading a live send off the
/// campaign totals does not work: wave 1 contributes 1,364 sends and would
/// drown any signal from the few hundred that have gone out today, so a
/// delivery collapse in the current run would still show a healthy overall
/// rate.
function TrenchPanel({
  trench: tr,
  webhookHealthy,
}: {
  trench: TrenchReport;
  webhookHealthy: boolean;
}) {
  const progress = tr.target > 0 ? tr.sent / tr.target : 0;
  const live = tr.remaining > 0 && tr.sent > 0;
  const done = tr.sent > 0 && tr.remaining === 0;
  const clock = (iso: string | null) =>
    iso ? `${iso.slice(11, 16)} UTC` : "not yet";
  const dayOf = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

  return (
    <Panel
      title={`${tr.name}: rollout report`}
      hint={`${tr.waveLabel} - "${tr.subject}"`}
      action={
        <span
          className={`rounded border px-2 py-0.5 font-mono text-[10px] ${
            live
              ? "border-emerald-400/30 text-emerald-300"
              : done
                ? "border-white/15 text-white/50"
                : "border-white/10 text-white/35"
          }`}
        >
          {live ? "sending" : done ? "complete" : "not started"}
        </span>
      }
    >
      {/* Progress against the run's target, not the cohort. */}
      <div className="mb-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-sm text-white/70">
            <span className="text-[22px] tabular-nums text-white">
              {nf.format(tr.sent)}
            </span>
            <span className="text-white/40"> of {nf.format(tr.target)} sent</span>
            <span className="ml-3 text-[11px] text-white/35">
              batch {tr.batchesDone} of {tr.batchesTotal}, {tr.batchSize} per batch
            </span>
          </div>
          <div className="text-[11px] tabular-nums text-white/40">
            started {clock(tr.startedAt)}
            {tr.etaAt ? ` - finishes about ${clock(tr.etaAt)}` : ""}
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
              background: live ? OK : "rgba(255,255,255,0.65)",
            }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-white/35">
          <span>{pct(progress, 0)} of this run</span>
          <span>{nf.format(tr.remaining)} still to send</span>
        </div>
      </div>

      {/* The numbers that decide whether to keep going. */}
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Mini
          label="Has access"
          value={tr.granted}
          caption={
            tr.granted >= tr.cohort
              ? "whole cohort, verified"
              : `${nf.format(tr.cohort - tr.granted)} missing`
          }
          tone={tr.granted >= tr.cohort ? OK : WATCH}
        />
        <Mini
          label="Delivered"
          value={tr.delivered}
          caption={tr.sent > 0 ? `${pct(tr.deliveryRate)} of sent` : "awaiting send"}
          tone={tr.sent > 0 && tr.deliveryRate < 0.9 ? WATCH : undefined}
        />
        <Mini
          label="Bounced"
          value={tr.bounced}
          caption={tr.sent > 0 ? `${pct(tr.bounceRate, 2)} of sent` : "none"}
          tone={tr.bounced > 0 ? toneFor(tr.bounceRate, 0.02, 0.04) : undefined}
        />
        <Mini
          label="Complaints"
          value={tr.complained}
          caption={tr.sent > 0 ? `${pct(tr.complaintRate, 3)} of sent` : "none"}
          tone={tr.complained > 0 ? BAD : undefined}
        />
        <Mini
          label="Unsubscribed"
          value={tr.unsubscribed}
          caption={tr.sent > 0 ? `${pct(tr.unsubscribeRate, 2)} of sent` : "none"}
        />
        <Mini
          label="Signed in after"
          value={tr.activated}
          caption={
            tr.delivered > 0
              ? `${pct(tr.activationRate)} of delivered`
              : "the number that matters"
          }
          tone={OK}
        />
      </div>

      {/* Cadence. A dead sender is a gap here long before it is a bad rate. */}
      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h4 className="text-[11px] uppercase tracking-wider text-white/40">
            Batch cadence
          </h4>
          <span className="text-[11px] text-white/30">
            {dayOf(tr.startedAt)} - 15 minute buckets
          </span>
        </div>
        <CadenceBars points={tr.cadence} batchSize={tr.batchSize} />
      </div>

      {/* Comparison against the previous run, and the honest caveats. */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="min-w-0 overflow-x-auto rounded-lg border border-white/8 p-3">
          <h4 className="mb-2 text-[11px] uppercase tracking-wider text-white/40">
            Against the first trench
          </h4>
          <table className="w-full min-w-[380px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/35">
                <th className="py-1.5 pr-3 font-medium">Run</th>
                <th className="py-1.5 pr-3 text-right font-medium">Sent</th>
                <th className="py-1.5 pr-3 text-right font-medium">Delivered</th>
                <th className="py-1.5 pr-3 text-right font-medium">Bounce</th>
                <th className="py-1.5 text-right font-medium">Signed in</th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow
                name={tr.previous.name}
                sent={tr.previous.sent}
                deliveryRate={tr.previous.deliveryRate}
                bounceRate={tr.previous.bounceRate}
                activationRate={tr.previous.activationRate}
                activated={tr.previous.activated}
              />
              <ComparisonRow
                name={tr.name}
                sent={tr.sent}
                deliveryRate={tr.deliveryRate}
                bounceRate={tr.bounceRate}
                activationRate={tr.activationRate}
                activated={tr.activated}
                current
              />
            </tbody>
          </table>
          <p className="mt-2.5 text-[11px] leading-relaxed text-white/40">
            The first trench finished weeks ago and has had all that time to
            convert, so its sign-in rate is a mature number and this run&apos;s
            is not. Compare bounce and delivery now, and sign-ins only once
            this run has had the same runway.
          </p>
        </div>

        <div className="min-w-0 rounded-lg border border-white/8 p-3">
          <h4 className="mb-2 text-[11px] uppercase tracking-wider text-white/40">
            What this report does not say
          </h4>
          <ul className="flex flex-col gap-2 text-[12px] leading-relaxed text-white/50">
            <li>
              <strong className="text-white/75">Opens are not tracked.</strong>{" "}
              Open tracking is off for this campaign, so the {tr.opened} above
              is structural, not a measurement. Tracking pixels are one of the
              signals filters weigh, and delivery matters more here than
              knowing who looked.
            </li>
            <li>
              <strong className="text-white/75">
                {nf.format(tr.heldBack)} people are held back.
              </strong>{" "}
              The cohort has {nf.format(tr.cohort)} members and this run mails{" "}
              {nf.format(tr.target)}. The remainder is not a stalled send, it
              is outside this run and stays queued for the next one.
            </li>
            <li>
              <strong className="text-white/75">
                {nf.format(tr.activatedBeforeSend)} were already users.
              </strong>{" "}
              They are in this cohort and have terminal accounts, but those
              accounts predate the invite, so they are excluded from the
              sign-in figure above. {nf.format(tr.cohortActivated)} people in
              the whole cohort have an account.
            </li>
            <li>
              <strong className="text-white/75">
                {webhookHealthy ? "Delivery is measured." : "Delivery is unmeasured."}
              </strong>{" "}
              {webhookHealthy
                ? "Resend's webhook is recording, so delivered, bounced and complained are facts rather than floors."
                : "No webhook events are arriving, so every delivery number here is a floor and the sender's abort gates cannot fire."}
            </li>
            {tr.suppressed > 0 ? (
              <li>
                <strong className="text-white/75">
                  {nf.format(tr.suppressed)} suppressed.
                </strong>{" "}
                Resend refused to send to these addresses because of prior
                bounces or complaints. They were never mailed and never will be.
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      {/* Where the mail is landing. Domain mix is the earliest warning of a
          filtering problem, because one provider degrades before the blended
          rate moves. */}
      {tr.domains.length > 0 ? (
        <div className="mt-6 min-w-0 overflow-x-auto">
          <h4 className="mb-2 text-[11px] uppercase tracking-wider text-white/40">
            By mailbox provider
          </h4>
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/35">
                <th className="py-1.5 pr-3 font-medium">Domain</th>
                <th className="py-1.5 pr-3 text-right font-medium">In cohort</th>
                <th className="py-1.5 pr-3 text-right font-medium">Sent</th>
                <th className="py-1.5 pr-3 font-medium">Delivered</th>
                <th className="py-1.5 pr-3 text-right font-medium">Bounced</th>
                <th className="py-1.5 text-right font-medium">Signed in</th>
              </tr>
            </thead>
            <tbody>
              {tr.domains.map((d) => {
                const dr = d.sent > 0 ? d.delivered / d.sent : 0;
                return (
                  <tr key={d.domain} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-3 font-mono text-[12px] text-white/70">
                      {d.domain}
                    </td>
                    <Num v={d.total} />
                    <Num v={d.sent} dim={d.sent === 0} />
                    <td className="py-2 pr-3">
                      {d.sent > 0 ? (
                        <div className="flex items-center gap-2">
                          <MiniBar value={dr} tone={dr < 0.9 ? WATCH : OK} />
                          <span className="text-[11px] tabular-nums text-white/55">
                            {pct(dr, 0)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-white/25">not sent</span>
                      )}
                    </td>
                    <Num v={d.bounced} tone={d.bounced > 0 ? BAD : undefined} dim={d.bounced === 0} />
                    <Num v={d.activated} tone={d.activated > 0 ? OK : undefined} dim={d.activated === 0} last />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}

function ComparisonRow({
  name,
  sent,
  deliveryRate,
  bounceRate,
  activationRate,
  activated,
  current,
}: {
  name: string;
  sent: number;
  deliveryRate: number;
  bounceRate: number;
  activationRate: number;
  activated: number;
  current?: boolean;
}) {
  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="py-2 pr-3">
        <span className={current ? "text-white" : "text-white/60"}>{name}</span>
        {current ? (
          <span className="ml-2 text-[10px] text-white/30">in progress</span>
        ) : null}
      </td>
      <Num v={sent} />
      <td className="py-2 pr-3 text-right tabular-nums text-white/75">
        {sent > 0 ? pct(deliveryRate) : "n/a"}
      </td>
      <td
        className="py-2 pr-3 text-right tabular-nums"
        style={{ color: sent > 0 ? toneFor(bounceRate, 0.02, 0.04) : "rgba(255,255,255,0.25)" }}
      >
        {sent > 0 ? pct(bounceRate, 2) : "n/a"}
      </td>
      <td className="py-2 text-right tabular-nums" style={{ color: OK }}>
        {nf.format(activated)}
        <span className="ml-1.5 text-[11px] text-white/35">
          {sent > 0 ? pct(activationRate, 0) : ""}
        </span>
      </td>
    </tr>
  );
}

function Panel({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-white/8 bg-white/[0.02] p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-medium tracking-wide text-white">{title}</h3>
          {hint ? <p className="mt-0.5 text-[11px] text-white/35">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  sub,
  share,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  share?: number;
  tone?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <div className="text-[11px] uppercase tracking-wider text-white/40">{label}</div>
      <div
        className="mt-1 text-[26px] leading-none tabular-nums"
        style={{ color: tone ?? "rgb(255 255 255)" }}
      >
        {nf.format(value)}
      </div>
      {share !== undefined ? (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(0, Math.min(1, share)) * 100}%`,
              background: tone ?? "rgba(255,255,255,0.7)",
            }}
          />
        </div>
      ) : null}
      <div className="mt-1.5 text-[11px] text-white/35">{sub}</div>
    </div>
  );
}

/// Compact figure for dense grids, where a full Kpi card would waste space.
function Mini({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: number;
  caption?: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div
        className="mt-0.5 text-xl leading-none tabular-nums"
        style={{ color: tone ?? "rgb(255 255 255)" }}
      >
        {nf.format(value)}
      </div>
      {caption ? (
        <div className="mt-1 text-[10px] text-white/35">{caption}</div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: number;
  caption: string;
  tone?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-center">
      <span className="text-[11px] uppercase tracking-wider text-white/45">{label}</span>
      <span
        className="mt-1 text-[26px] leading-none tabular-nums"
        style={{ color: tone ?? "rgb(255 255 255)" }}
      >
        {nf.format(value)}
      </span>
      <span className="mt-1 text-[11px] text-white/35">{caption}</span>
    </div>
  );
}

function Num({
  v,
  tone,
  dim,
  last,
}: {
  v: number;
  tone?: string;
  dim?: boolean;
  last?: boolean;
}) {
  return (
    <td
      className={`py-2.5 text-right tabular-nums ${last ? "" : "pr-3"}`}
      style={{ color: tone ?? (dim ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.85)") }}
    >
      {nf.format(v)}
    </td>
  );
}

const CHIP: Record<string, string> = {
  "email.sent": "border-white/15 text-white/60",
  "email.delivered": "border-emerald-400/30 text-emerald-300",
  "email.delivery_delayed": "border-amber-400/30 text-amber-300",
  "email.bounced": "border-rose-400/30 text-rose-300",
  "email.failed": "border-rose-400/30 text-rose-300",
  "email.complained": "border-rose-400/40 text-rose-200",
  "email.opened": "border-sky-400/30 text-sky-300",
  "email.clicked": "border-indigo-400/30 text-indigo-300",
};

function EventChip({ type }: { type: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[10px] ${
        CHIP[type] ?? "border-white/15 text-white/50"
      }`}
    >
      {type.replace("email.", "")}
    </span>
  );
}

function TrackingRow({
  label,
  enabled,
  value,
  why,
}: {
  label: string;
  enabled: boolean;
  value: number;
  why: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/80">{label}</span>
          <span
            className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${
              enabled
                ? "border-emerald-400/30 text-emerald-300"
                : "border-white/12 text-white/35"
            }`}
          >
            {enabled ? "on" : "off"}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-white/35">{why}</p>
      </div>
      <span className="shrink-0 text-lg tabular-nums text-white/25">
        {enabled ? nf.format(value) : "off"}
      </span>
    </div>
  );
}

function Banner({
  tone,
  title,
  children,
}: {
  tone: "ok" | "watch" | "bad";
  title: string;
  children: ReactNode;
}) {
  const styles = {
    ok: "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-100/80",
    watch: "border-amber-400/30 bg-amber-400/[0.07] text-amber-100/85",
    bad: "border-rose-400/35 bg-rose-400/[0.08] text-rose-100/85",
  }[tone];
  const dot = { ok: OK, watch: WATCH, bad: BAD }[tone];
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 text-[12px] leading-relaxed ${styles}`}>
      <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full" style={{ background: dot }} />
      <p className="min-w-0">
        <strong className="font-semibold">{title}.</strong> {children}
      </p>
    </div>
  );
}
