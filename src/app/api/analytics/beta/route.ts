import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { getPrismaClient } from "@/src/lib/prisma";
import { getTrenchersPool } from "@/src/lib/trenchers-db";
import {
  BETA_CAMPAIGN,
  WAVE_LABELS,
  WAVE_ORDER,
  type InviteWave,
} from "@/src/lib/beta-invite";

export const runtime = "nodejs";

// One payload powers the whole Beta access tab. Every number here is either
// a count from our own table or a fact read from a system of record
// (Resend's webhook events, the terminal's whitelist). Nothing is estimated.

export type FunnelStep = {
  key: string;
  label: string;
  count: number;
  /// What this stage measures, shown on hover. Several of these numbers look
  /// similar but mean very different things.
  note: string;
};

export type WaveRow = {
  wave: InviteWave;
  label: string;
  total: number;
  granted: number;
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  failed: number;
  activated: number;
};

export type SeriesPoint = {
  bucket: string;
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
};

export type DomainRow = {
  domain: string;
  total: number;
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  activated: number;
};

export type EventRow = {
  type: string;
  email: string | null;
  occurredAt: string;
  detail: string | null;
};

function domainOf(email: string) {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

/// Pulls the recipient address out of a stored Resend payload. Shape is
/// `{ data: { to: ["a@b.com"] } }`, but `to` has been seen as a bare string
/// too, so handle both rather than trusting one.
function recipientFromPayload(payload: unknown): string | null {
  const data = (payload as { data?: { to?: unknown } })?.data;
  if (!data) return null;
  if (Array.isArray(data.to)) {
    const first = data.to[0];
    return typeof first === "string" ? first : null;
  }
  return typeof data.to === "string" ? data.to : null;
}

/// Bounce classification. Permanent bounces are the ones that destroy
/// reputation and must be suppressed; transient ones are mailbox-full style
/// noise that resolves itself.
function bounceDetail(payload: unknown): string | null {
  const b = (payload as { data?: { bounce?: { type?: string; subType?: string } } })
    ?.data?.bounce;
  if (!b) return null;
  return [b.type, b.subType].filter(Boolean).join(" / ") || null;
}

export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const prisma = getPrismaClient();
  const where = { campaign: BETA_CAMPAIGN };

  const rows = await prisma.betaInvite.findMany({
    where,
    select: {
      wave: true,
      accessGrantedAt: true,
      sentAt: true,
      deliveredAt: true,
      openedAt: true,
      clickedAt: true,
      bouncedAt: true,
      complainedAt: true,
      unsubscribedAt: true,
      failedAt: true,
      activatedAt: true,
      subscriber: { select: { email: true } },
    },
  });

  const emails = rows.map((r) => r.subscriber.email.trim().toLowerCase());

  // --- terminal cross-reference -----------------------------------------
  // accessGrantedAt records that our grant call returned 2xx. login_whitelist
  // records who can actually sign in. Those can diverge, and only the second
  // one is true, so prefer it whenever the terminal is reachable.
  let whitelisted: Set<string> | null = null;
  let signedIn: Set<string> | null = null;
  const pool = getTrenchersPool();
  if (pool && emails.length > 0) {
    try {
      const [wl, us] = await Promise.all([
        pool.query<{ value: string }>(
          `SELECT value FROM login_whitelist
            WHERE enabled = TRUE AND kind = 'email' AND value = ANY($1::text[])`,
          [emails],
        ),
        pool.query<{ email: string }>(
          `SELECT lower(email) AS email FROM users
            WHERE email IS NOT NULL AND lower(email) = ANY($1::text[])`,
          [emails],
        ),
      ]);
      whitelisted = new Set(wl.rows.map((r) => r.value));
      signedIn = new Set(us.rows.map((r) => r.email));
    } catch (err) {
      console.error("[analytics/beta] terminal cross-reference failed:", err);
    }
  }

  const hasAccess = (e: string) =>
    whitelisted ? whitelisted.has(e) : false;
  const hasSignedIn = (e: string) => (signedIn ? signedIn.has(e) : false);

  // --- totals ------------------------------------------------------------
  let total = 0,
    granted = 0,
    sent = 0,
    delivered = 0,
    opened = 0,
    clicked = 0,
    bounced = 0,
    complained = 0,
    unsubscribed = 0,
    failed = 0,
    activated = 0;

  const waveMap = new Map<string, WaveRow>();
  for (const w of WAVE_ORDER) {
    waveMap.set(w, {
      wave: w,
      label: WAVE_LABELS[w],
      total: 0,
      granted: 0,
      sent: 0,
      delivered: 0,
      bounced: 0,
      complained: 0,
      unsubscribed: 0,
      failed: 0,
      activated: 0,
    });
  }

  const domainMap = new Map<string, DomainRow>();

  for (const r of rows) {
    const email = r.subscriber.email.trim().toLowerCase();
    const dom = domainOf(email);
    const localGranted = r.accessGrantedAt !== null;
    const g = whitelisted ? hasAccess(email) : localGranted;
    const a = signedIn ? hasSignedIn(email) : r.activatedAt !== null;

    total++;
    if (g) granted++;
    if (r.sentAt) sent++;
    if (r.deliveredAt) delivered++;
    if (r.openedAt) opened++;
    if (r.clickedAt) clicked++;
    if (r.bouncedAt) bounced++;
    if (r.complainedAt) complained++;
    if (r.unsubscribedAt) unsubscribed++;
    if (r.failedAt) failed++;
    if (a) activated++;

    const wr = waveMap.get(r.wave);
    if (wr) {
      wr.total++;
      if (g) wr.granted++;
      if (r.sentAt) wr.sent++;
      if (r.deliveredAt) wr.delivered++;
      if (r.bouncedAt) wr.bounced++;
      if (r.complainedAt) wr.complained++;
      if (r.unsubscribedAt) wr.unsubscribed++;
      if (r.failedAt) wr.failed++;
      if (a) wr.activated++;
    }

    let dr = domainMap.get(dom);
    if (!dr) {
      dr = {
        domain: dom,
        total: 0,
        sent: 0,
        delivered: 0,
        bounced: 0,
        complained: 0,
        unsubscribed: 0,
        activated: 0,
      };
      domainMap.set(dom, dr);
    }
    dr.total++;
    if (r.sentAt) dr.sent++;
    if (r.deliveredAt) dr.delivered++;
    if (r.bouncedAt) dr.bounced++;
    if (r.complainedAt) dr.complained++;
    if (r.unsubscribedAt) dr.unsubscribed++;
    if (a) dr.activated++;
  }

  const funnel: FunnelStep[] = [
    {
      key: "prepared",
      label: "Prepared",
      count: total,
      note: "Graded as mailable and given an invite row",
    },
    {
      key: "granted",
      label: "Has beta access",
      count: granted,
      note: whitelisted
        ? "Enabled in the terminal's login_whitelist right now"
        : "Local record only, terminal not reachable",
    },
    {
      key: "sent",
      label: "Email sent",
      count: sent,
      note: "Accepted by Resend for delivery",
    },
    {
      key: "delivered",
      label: "Delivered",
      count: delivered,
      note: "Confirmed accepted by the recipient's mail server",
    },
    {
      key: "activated",
      label: "Signed in",
      count: activated,
      note: signedIn
        ? "Exists in the terminal's users table"
        : "Local record only, terminal not reachable",
    },
  ];

  // --- time series from webhook events ----------------------------------
  // Bucketed by hour so the pacing of a live send is visible. Reads
  // EmailEvent rather than the folded columns so delivery_delayed and
  // failed show up too.
  const events = await prisma.emailEvent.findMany({
    select: { type: true, occurredAt: true, payload: true },
    orderBy: { occurredAt: "asc" },
  });

  const seriesMap = new Map<string, SeriesPoint>();
  const eventTypeCounts = new Map<string, number>();
  const bounceReasons = new Map<string, number>();

  for (const e of events) {
    eventTypeCounts.set(e.type, (eventTypeCounts.get(e.type) ?? 0) + 1);
    if (e.type === "email.bounced") {
      const d = bounceDetail(e.payload) ?? "unspecified";
      bounceReasons.set(d, (bounceReasons.get(d) ?? 0) + 1);
    }
    const bucket = e.occurredAt.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    let p = seriesMap.get(bucket);
    if (!p) {
      p = { bucket, sent: 0, delivered: 0, bounced: 0, complained: 0 };
      seriesMap.set(bucket, p);
    }
    if (e.type === "email.sent") p.sent++;
    else if (e.type === "email.delivered") p.delivered++;
    else if (e.type === "email.bounced" || e.type === "email.failed") p.bounced++;
    else if (e.type === "email.complained") p.complained++;
  }

  const series = [...seriesMap.values()].sort((a, b) =>
    a.bucket.localeCompare(b.bucket),
  );

  const recentEvents: EventRow[] = events
    .slice(-40)
    .reverse()
    .map((e) => ({
      type: e.type,
      email: recipientFromPayload(e.payload),
      occurredAt: e.occurredAt.toISOString(),
      detail: bounceDetail(e.payload),
    }));

  const domains = [...domainMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const rate = (n: number, d: number) => (d > 0 ? n / d : 0);

  return Response.json({
    campaign: BETA_CAMPAIGN,
    generatedAt: new Date().toISOString(),
    funnel,
    waves: WAVE_ORDER.map((w) => waveMap.get(w)!),
    series,
    domains,
    recentEvents,
    eventTypes: [...eventTypeCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    bounceReasons: [...bounceReasons.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    totals: {
      total,
      granted,
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      complained,
      unsubscribed,
      failed,
      activated,
      pending: total - sent,
    },
    reputation: {
      bounceRate: rate(bounced, sent),
      complaintRate: rate(complained, sent),
      deliveryRate: rate(delivered, sent),
      unsubscribeRate: rate(unsubscribed, sent),
      activationRate: rate(activated, delivered),
      bounceLimit: 0.04,
      complaintLimit: 0.0008,
      bouncePause: 0.02,
      complaintPause: 0.0004,
      webhookHealthy: events.length > 0,
      totalEvents: events.length,
    },
    // Open and click tracking are switched off on this campaign. Surfacing
    // that explicitly stops a permanent 0 from being read as "nobody
    // engaged" rather than "we chose not to measure this".
    tracking: { opens: false, clicks: false },
    accessSource: whitelisted ? ("terminal" as const) : ("local" as const),
  });
}
