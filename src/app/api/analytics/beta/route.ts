import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { getPrismaClient } from "@/src/lib/prisma";
import { getTrenchersPool } from "@/src/lib/trenchers-db";
import {
  ACTIVE_ROLLOUT,
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
  pending: number;
  delivered: number;
  opened: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  failed: number;
  suppressed: number;
  /// Everyone in the wave with a terminal account, whenever it was made.
  activated: number;
  /// Account created at or after we mailed them. This is the number the
  /// email can claim; `activated` includes people who were already users.
  activatedAfterSend: number;
  /// Had an account before the invite went out.
  activatedBeforeSend: number;
  /// Rates are computed server-side so every surface reads the same
  /// denominator. Delivery is over sent; activation is `activatedAfterSend`
  /// over delivered, because someone who never received it cannot have
  /// signed in because of it and someone who was already a user did not.
  deliveryRate: number;
  bounceRate: number;
  complaintRate: number;
  activationRate: number;
};

/// A focused report on one rollout, so the wave being mailed right now can
/// be read on its own rather than inferred from campaign-wide totals that
/// are dominated by earlier sends.
export type TrenchReport = {
  wave: InviteWave;
  name: string;
  waveLabel: string;
  subject: string;
  /// Everyone graded into this wave.
  cohort: number;
  /// How many of them this run mails.
  target: number;
  /// Cohort minus target: real people, deliberately not in this run.
  heldBack: number;
  granted: number;
  sent: number;
  /// Still to go in THIS run, not the whole cohort.
  remaining: number;
  batchSize: number;
  batchesTotal: number;
  batchesDone: number;
  startedAt: string | null;
  lastSentAt: string | null;
  /// Projected finish from the declared pacing, null once the run is done.
  etaAt: string | null;
  delivered: number;
  opened: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  suppressed: number;
  failed: number;
  /// Signed in after we mailed them. The number the send can claim.
  activated: number;
  /// Already had an account when the invite went out.
  activatedBeforeSend: number;
  /// Everyone in the cohort with an account, mailed or not.
  cohortActivated: number;
  deliveryRate: number;
  bounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
  activationRate: number;
  /// Open tracking is off for this campaign, so `opened` is structurally 0
  /// and must not be read as "nobody opened it".
  openTracked: boolean;
  /// 15-minute buckets, which is the batch cadence, so a stalled sender is
  /// visible as a gap rather than hiding inside an hourly average.
  cadence: { bucket: string; sent: number; delivered: number; bounced: number }[];
  domains: DomainRow[];
  /// The previous run at the same point, for an honest comparison.
  previous: {
    wave: InviteWave;
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
  /// Same rule as the wave table: account created at or after the send.
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

/// Floor a timestamp to a 15-minute bucket, the cadence a batch send runs at.
function quarterHour(d: Date): string {
  const t = new Date(d);
  t.setUTCSeconds(0, 0);
  t.setUTCMinutes(Math.floor(t.getUTCMinutes() / 15) * 15);
  return t.toISOString();
}

/// Same shape as the campaign-wide domain table, scoped to one wave.
function bumpDomain(
  map: Map<string, DomainRow>,
  domain: string,
  r: {
    sentAt: Date | null;
    deliveredAt: Date | null;
    bouncedAt: Date | null;
    complainedAt: Date | null;
    unsubscribedAt: Date | null;
  },
  activatedAfterSend: boolean,
): DomainRow {
  const d = map.get(domain) ?? {
    domain,
    total: 0,
    sent: 0,
    delivered: 0,
    bounced: 0,
    complained: 0,
    unsubscribed: 0,
    activated: 0,
  };
  d.total++;
  if (r.sentAt) d.sent++;
  if (r.deliveredAt) d.delivered++;
  if (r.bouncedAt) d.bounced++;
  if (r.complainedAt) d.complained++;
  if (r.unsubscribedAt) d.unsubscribed++;
  if (activatedAfterSend) d.activated++;
  return d;
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
      suppressedAt: true,
      reminderSentAt: true,
      reminderDeliveredAt: true,
      reminderOpenedAt: true,
      reminderBouncedAt: true,
      reminderComplainedAt: true,
      nudgeSentAt: true,
      nudgeDeliveredAt: true,
      nudgeOpenedAt: true,
      nudgeBouncedAt: true,
      nudgeComplainedAt: true,
      subscriber: { select: { email: true } },
    },
  });

  const emails = rows.map((r) => r.subscriber.email.trim().toLowerCase());

  // --- terminal cross-reference -----------------------------------------
  // accessGrantedAt records that our grant call returned 2xx. login_whitelist
  // records who can actually sign in. Those can diverge, and only the second
  // one is true, so prefer it whenever the terminal is reachable.
  let whitelisted: Set<string> | null = null;
  let signedIn: Map<string, Date | null> | null = null;
  const pool = getTrenchersPool();
  if (pool && emails.length > 0) {
    try {
      const [wl, us] = await Promise.all([
        pool.query<{ value: string }>(
          `SELECT value FROM login_whitelist
            WHERE enabled = TRUE AND kind = 'email' AND value = ANY($1::text[])`,
          [emails],
        ),
        // created_at, not just membership. Plenty of waitlist people already
        // had an account before we mailed them, and counting those as
        // "signed in because of the email" would overstate every wave.
        pool.query<{ email: string; created_at: Date | null }>(
          `SELECT lower(email) AS email, min(created_at) AS created_at
             FROM users
            WHERE email IS NOT NULL AND lower(email) = ANY($1::text[])
            GROUP BY 1`,
          [emails],
        ),
      ]);
      whitelisted = new Set(wl.rows.map((r) => r.value));
      signedIn = new Map(us.rows.map((r) => [r.email, r.created_at]));
    } catch (err) {
      console.error("[analytics/beta] terminal cross-reference failed:", err);
    }
  }

  const hasAccess = (e: string) =>
    whitelisted ? whitelisted.has(e) : false;
  const hasSignedIn = (e: string) => (signedIn ? signedIn.has(e) : false);
  /// True only when the account was created at or after we mailed them, which
  /// is the closest thing to attribution we can get without click tracking.
  const signedInAfter = (e: string, sentAt: Date | null) => {
    if (!signedIn || !sentAt) return false;
    const created = signedIn.get(e);
    return created ? created.getTime() >= sentAt.getTime() : false;
  };

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
    activated = 0,
    activatedAfterSend = 0;

  const waveMap = new Map<string, WaveRow>();
  for (const w of WAVE_ORDER) {
    waveMap.set(w, {
      wave: w,
      label: WAVE_LABELS[w],
      total: 0,
      granted: 0,
      sent: 0,
      pending: 0,
      delivered: 0,
      opened: 0,
      bounced: 0,
      complained: 0,
      unsubscribed: 0,
      failed: 0,
      suppressed: 0,
      activated: 0,
      activatedAfterSend: 0,
      activatedBeforeSend: 0,
      deliveryRate: 0,
      bounceRate: 0,
      complaintRate: 0,
      activationRate: 0,
    });
  }

  const domainMap = new Map<string, DomainRow>();

  // Accumulators for the rollout in flight. Filled inside the same pass over
  // `rows` rather than a second query, because the payload is already one
  // round trip and a second one would drift under a live send.
  const trenchDomains = new Map<string, DomainRow>();
  const trenchSentAt: Date[] = [];
  const cadenceMap = new Map<
    string,
    { bucket: string; sent: number; delivered: number; bounced: number }
  >();

  for (const r of rows) {
    const email = r.subscriber.email.trim().toLowerCase();
    const dom = domainOf(email);
    const localGranted = r.accessGrantedAt !== null;
    const g = whitelisted ? hasAccess(email) : localGranted;
    const a = signedIn ? hasSignedIn(email) : r.activatedAt !== null;
    const aAfter = signedIn
      ? signedInAfter(email, r.sentAt)
      : a && r.sentAt !== null;

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
    if (aAfter) activatedAfterSend++;

    const wr = waveMap.get(r.wave);
    if (wr) {
      wr.total++;
      if (g) wr.granted++;
      if (r.sentAt) wr.sent++;
      else wr.pending++;
      if (r.deliveredAt) wr.delivered++;
      if (r.openedAt) wr.opened++;
      if (r.bouncedAt) wr.bounced++;
      if (r.complainedAt) wr.complained++;
      if (r.unsubscribedAt) wr.unsubscribed++;
      if (r.failedAt) wr.failed++;
      if (r.suppressedAt) wr.suppressed++;
      if (a) wr.activated++;
      if (aAfter) wr.activatedAfterSend++;
      else if (a) wr.activatedBeforeSend++;
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
    if (aAfter) dr.activated++;

    // --- active rollout, walked in the same pass -----------------------
    if (r.wave === ACTIVE_ROLLOUT.wave) {
      trenchDomains.set(dom, bumpDomain(trenchDomains, dom, r, aAfter));
      if (r.sentAt) {
        trenchSentAt.push(r.sentAt);
        // 15-minute buckets: the batch cadence. An hourly bucket would smear
        // four batches together and hide a sender that died mid-run.
        const b = quarterHour(r.sentAt);
        const c = cadenceMap.get(b) ?? { bucket: b, sent: 0, delivered: 0, bounced: 0 };
        c.sent++;
        cadenceMap.set(b, c);
      }
      if (r.deliveredAt) {
        const b = quarterHour(r.deliveredAt);
        const c = cadenceMap.get(b) ?? { bucket: b, sent: 0, delivered: 0, bounced: 0 };
        c.delivered++;
        cadenceMap.set(b, c);
      }
      if (r.bouncedAt) {
        const b = quarterHour(r.bouncedAt);
        const c = cadenceMap.get(b) ?? { bucket: b, sent: 0, delivered: 0, bounced: 0 };
        c.bounced++;
        cadenceMap.set(b, c);
      }
    }
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
      label: "Signed in after the invite",
      count: activatedAfterSend,
      note: signedIn
        ? `Terminal account created at or after we mailed them. A further ${activated - activatedAfterSend} were already users.`
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

  // Fold the rates onto each wave once, here, so the trench report and the
  // wave table cannot disagree about a denominator.
  for (const r of waveMap.values()) {
    r.deliveryRate = r.sent > 0 ? r.delivered / r.sent : 0;
    r.bounceRate = r.sent > 0 ? r.bounced / r.sent : 0;
    r.complaintRate = r.sent > 0 ? r.complained / r.sent : 0;
    r.activationRate =
      r.delivered > 0 ? r.activatedAfterSend / r.delivered : 0;
  }

  // --- the rollout in flight --------------------------------------------
  const aw = waveMap.get(ACTIVE_ROLLOUT.wave)!;
  const pw = waveMap.get(ACTIVE_ROLLOUT.previousWave)!;
  trenchSentAt.sort((a, b) => a.getTime() - b.getTime());
  const startedAt = trenchSentAt[0] ?? null;
  const lastSentAt = trenchSentAt[trenchSentAt.length - 1] ?? null;

  // Remaining is measured against the run's target, not the cohort, so the
  // 55 people held back from wave 2 do not read as an unfinished send.
  const trenchTarget = Math.min(ACTIVE_ROLLOUT.target, aw.total);
  const trenchRemaining = Math.max(0, trenchTarget - aw.sent);
  const batchesTotal = Math.ceil(trenchTarget / ACTIVE_ROLLOUT.batchSize);
  const batchesDone = Math.min(
    batchesTotal,
    Math.floor(aw.sent / ACTIVE_ROLLOUT.batchSize),
  );
  const etaAt =
    trenchRemaining > 0 && lastSentAt
      ? new Date(
          lastSentAt.getTime() +
            Math.ceil(trenchRemaining / ACTIVE_ROLLOUT.batchSize) *
              ACTIVE_ROLLOUT.spacingMinutes *
              60_000,
        ).toISOString()
      : null;

  const trench: TrenchReport = {
    wave: ACTIVE_ROLLOUT.wave,
    name: ACTIVE_ROLLOUT.name,
    waveLabel: WAVE_LABELS[ACTIVE_ROLLOUT.wave],
    subject: ACTIVE_ROLLOUT.subject,
    cohort: aw.total,
    target: trenchTarget,
    heldBack: Math.max(0, aw.total - trenchTarget),
    granted: aw.granted,
    sent: aw.sent,
    remaining: trenchRemaining,
    batchSize: ACTIVE_ROLLOUT.batchSize,
    batchesTotal,
    batchesDone,
    startedAt: startedAt ? startedAt.toISOString() : null,
    lastSentAt: lastSentAt ? lastSentAt.toISOString() : null,
    etaAt,
    delivered: aw.delivered,
    opened: aw.opened,
    bounced: aw.bounced,
    complained: aw.complained,
    unsubscribed: aw.unsubscribed,
    suppressed: aw.suppressed,
    failed: aw.failed,
    activated: aw.activatedAfterSend,
    activatedBeforeSend: aw.activatedBeforeSend,
    cohortActivated: aw.activated,
    deliveryRate: aw.deliveryRate,
    bounceRate: aw.bounceRate,
    complaintRate: aw.complaintRate,
    unsubscribeRate: aw.sent > 0 ? aw.unsubscribed / aw.sent : 0,
    activationRate: aw.activationRate,
    openTracked: aw.opened > 0,
    cadence: [...cadenceMap.values()].sort((a, b) =>
      a.bucket.localeCompare(b.bucket),
    ),
    domains: [...trenchDomains.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 12),
    previous: {
      wave: ACTIVE_ROLLOUT.previousWave,
      name: "First trench",
      sent: pw.sent,
      delivered: pw.delivered,
      bounced: pw.bounced,
      complained: pw.complained,
      activated: pw.activatedAfterSend,
      deliveryRate: pw.deliveryRate,
      bounceRate: pw.bounceRate,
      activationRate: pw.activationRate,
    },
  };

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

  // --- per-send comparison ----------------------------------------------
  // One row per message rather than one blended campaign total. The three
  // sends went to different audiences for different reasons, so an averaged
  // bounce or open rate would describe none of them, and a problem caused
  // by one send would be diluted by the other two.
  type SendRow = {
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
  };

  let iSent = 0, iDelivered = 0, iOpened = 0, iBounced = 0, iComplained = 0, iUnsub = 0;
  let nSent = 0, nDelivered = 0, nOpened = 0, nBounced = 0, nComplained = 0;
  for (const r of rows) {
    if (r.sentAt) {
      iSent++;
      if (r.deliveredAt) iDelivered++;
      if (r.openedAt) iOpened++;
      if (r.bouncedAt) iBounced++;
      if (r.complainedAt) iComplained++;
      if (r.unsubscribedAt) iUnsub++;
    }
    if (r.nudgeSentAt) {
      nSent++;
      if (r.nudgeDeliveredAt) nDelivered++;
      if (r.nudgeOpenedAt) nOpened++;
      if (r.nudgeBouncedAt) nBounced++;
      if (r.nudgeComplainedAt) nComplained++;
    }
  }

  // --- seventh send: the public-beta Falcon CLAIM campaign --------------
  // Counted from `WaitlistSubscriber`, NOT from the `rows` loop above, and
  // that is the whole point of it being separate: this send goes to the
  // entire waitlist rather than a wave, and 3,740 of those addresses have no
  // BetaInvite row at all. Aggregating it over `rows` would silently report
  // only the invited slice and understate every number on the card.
  const claimAgg = await prisma.waitlistSubscriber.aggregate({
    _count: {
      falconClaimSentAt: true,
      falconClaimDeliveredAt: true,
      falconClaimBouncedAt: true,
      falconClaimComplainedAt: true,
      falconClaimSuppressedAt: true,
    },
  });
  const cSent = claimAgg._count.falconClaimSentAt;
  const cDelivered = claimAgg._count.falconClaimDeliveredAt;
  const cBounced = claimAgg._count.falconClaimBouncedAt;
  const cComplained = claimAgg._count.falconClaimComplainedAt;
  const cSuppressed = claimAgg._count.falconClaimSuppressedAt;
  const cUnsub = await prisma.waitlistSubscriber.count({
    where: { unsubscribedAt: { not: null } },
  });
  // Everyone still owed the mail. Excludes opt-outs, since they are not
  // pending, they are done.
  const cPending = await prisma.waitlistSubscriber.count({
    where: { falconClaimSentAt: null, unsubscribedAt: null },
  });

  // --- second send: the signup-issue reminder ---------------------------
  // Reported separately rather than folded into the totals. The two sends
  // went to different audiences for different reasons, so a single blended
  // bounce rate would describe neither of them. `recovered` is the number
  // that justifies the send existing at all: people who had not signed in
  // when they were mailed, and have since.
  let rSent = 0,
    rDelivered = 0,
    rOpened = 0,
    rBounced = 0,
    rComplained = 0,
    rRecovered = 0;
  for (const r of rows) {
    if (!r.reminderSentAt) continue;
    rSent++;
    if (r.reminderDeliveredAt) rDelivered++;
    if (r.reminderOpenedAt) rOpened++;
    if (r.reminderBouncedAt) rBounced++;
    if (r.reminderComplainedAt) rComplained++;
    const email = r.subscriber.email.trim().toLowerCase();
    if (signedIn ? signedIn.has(email) : r.activatedAt !== null) rRecovered++;
  }
  // Everyone still eligible for the reminder: mailed the invite, reachable,
  // not yet reminded, not signed in.
  const rPending = rows.filter(
    (r) =>
      r.sentAt &&
      !r.reminderSentAt &&
      !r.unsubscribedAt &&
      !r.bouncedAt &&
      !r.complainedAt &&
      !(signedIn
        ? signedIn.has(r.subscriber.email.trim().toLowerCase())
        : r.activatedAt !== null),
  ).length;

  return Response.json({
    campaign: BETA_CAMPAIGN,
    generatedAt: new Date().toISOString(),
    funnel,
    // Rates are computed here, once, so every surface reads the same
    // denominators. Delivery over sent; activation over DELIVERED, because
    // someone who never received the email cannot have signed in because of
    // it, and dividing by sent would quietly understate a wave whose mail
    // is still in flight.
    waves: WAVE_ORDER.map((w) => waveMap.get(w)!),
    trench,
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
      activated: activatedAfterSend,
      activatedBeforeSend: activated - activatedAfterSend,
      pending: total - sent,
    },
    reputation: {
      bounceRate: rate(bounced, sent),
      complaintRate: rate(complained, sent),
      deliveryRate: rate(delivered, sent),
      unsubscribeRate: rate(unsubscribed, sent),
      activationRate: rate(activatedAfterSend, delivered),
      bounceLimit: 0.04,
      complaintLimit: 0.0008,
      bouncePause: 0.02,
      complaintPause: 0.0004,
      webhookHealthy: events.length > 0,
      totalEvents: events.length,
    },
    sends: [
      {
        key: "invite",
        label: "Beta invite",
        audience: "Wave 1, survey completers",
        sent: iSent, delivered: iDelivered, opened: iOpened,
        bounced: iBounced, complained: iComplained, unsubscribed: iUnsub,
        openTracked: iOpened > 0,
      },
      {
        key: "reminder",
        label: "Signup issue mail",
        audience: "Invitees who had not signed in",
        sent: rSent, delivered: rDelivered, opened: rOpened,
        bounced: rBounced, complained: rComplained, unsubscribed: 0,
        openTracked: rOpened > 0,
      },
      {
        key: "nudge",
        label: "Activation nudge",
        audience: "Users who have signed in",
        sent: nSent, delivered: nDelivered, opened: nOpened,
        bounced: nBounced, complained: nComplained, unsubscribed: 0,
        openTracked: nOpened > 0,
      },
      {
        key: "falcon-claim",
        label: "Falcon claim (public beta)",
        audience: "Whole waitlist — 14,199 addresses",
        sent: cSent, delivered: cDelivered, opened: 0,
        bounced: cBounced, complained: cComplained, unsubscribed: cUnsub,
        openTracked: false,
      },
    ] satisfies SendRow[],
    // Reported on its own terms as well as in `sends`, because it is the only
    // campaign that can still be MID-FLIGHT when this page is read: it is
    // paced across hours, so `pending` is a live number an operator watches
    // rather than a historical one. `suppressed` is broken out because those
    // messages never left and cost no reputation — folding them into bounces
    // would make a healthy run look like a failing one.
    falconClaim: {
      sent: cSent,
      delivered: cDelivered,
      bounced: cBounced,
      complained: cComplained,
      suppressed: cSuppressed,
      unsubscribed: cUnsub,
      pending: cPending,
      deliveryRate: rate(cDelivered, cSent),
      bounceRate: rate(cBounced, cSent),
      complaintRate: rate(cComplained, cSent),
      // Same thresholds the sender's own mid-flight gate aborts on, so the
      // dashboard and the script cannot disagree about what "too high" means.
      bounceLimit: 0.04,
      complaintLimit: 0.001,
    },
    // True only if ANY send ever recorded an open. Open tracking is off by
    // default, so a flat zero means "not measured", not "nobody read it",
    // and the UI has to say which.
    openTrackingEverUsed: iOpened + rOpened + nOpened > 0,
    // Second send, reported on its own terms. Blending it into the totals
    // would average two different audiences mailed for two different
    // reasons, and describe neither.
    reminder: {
      sent: rSent,
      delivered: rDelivered,
      bounced: rBounced,
      complained: rComplained,
      opened: rOpened,
      pending: rPending,
      recovered: rRecovered,
      deliveryRate: rate(rDelivered, rSent),
      bounceRate: rate(rBounced, rSent),
      complaintRate: rate(rComplained, rSent),
      recoveryRate: rate(rRecovered, rSent),
      bounceLimit: 0.04,
      complaintLimit: 0.0008,
      bouncePause: 0.02,
      complaintPause: 0.0004,
    },
    // Open and click tracking are switched off on this campaign. Surfacing
    // that explicitly stops a permanent 0 from being read as "nobody
    // engaged" rather than "we chose not to measure this".
    tracking: { opens: false, clicks: false },
    accessSource: whitelisted ? ("terminal" as const) : ("local" as const),
  });
}
