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

/// Cross-references our invite list against the terminal's own database.
///
/// `accessGrantedAt` on BetaInvite only records that our grant script got a
/// 2xx back. The authority on who can actually sign in is `login_whitelist`
/// in the terminal's Postgres, and the authority on who actually DID sign in
/// is its `users` table. Reading both means the dashboard reports reality
/// rather than our own optimistic bookkeeping, and a divergence between
/// "granted" and "whitelisted" is exactly the bug you would want to see.
///
/// Returns null when TRENCHERS_DATABASE_URL is unset (local dev) or the
/// query fails, so the tab degrades to our own columns instead of erroring.
async function crossReferenceTerminal(emails: string[]) {
  const pool = getTrenchersPool();
  if (!pool || emails.length === 0) return null;
  try {
    const [whitelisted, signedIn] = await Promise.all([
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
    return {
      whitelisted: new Set(whitelisted.rows.map((r) => r.value)),
      signedIn: new Set(signedIn.rows.map((r) => r.email)),
    };
  } catch (err) {
    console.error("[analytics/beta] terminal cross-reference failed:", err);
    return null;
  }
}

// One payload for the whole "Beta access" tab: the delivery funnel, the
// per-wave rollout table, reputation rates against Resend's limits, and a
// daily send timeline.

export type BetaFunnelStep = { key: string; label: string; count: number };

export type BetaWaveRow = {
  wave: InviteWave;
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

export type BetaDayPoint = { date: string; sent: number };

function dayKeyUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const prisma = getPrismaClient();
  const where = { campaign: BETA_CAMPAIGN };

  const [
    total,
    granted,
    sent,
    delivered,
    clicked,
    bounced,
    complained,
    unsubscribed,
    activated,
    failed,
  ] = await Promise.all([
    prisma.betaInvite.count({ where }),
    prisma.betaInvite.count({ where: { ...where, accessGrantedAt: { not: null } } }),
    prisma.betaInvite.count({ where: { ...where, sentAt: { not: null } } }),
    prisma.betaInvite.count({ where: { ...where, deliveredAt: { not: null } } }),
    prisma.betaInvite.count({ where: { ...where, clickedAt: { not: null } } }),
    prisma.betaInvite.count({ where: { ...where, bouncedAt: { not: null } } }),
    prisma.betaInvite.count({ where: { ...where, complainedAt: { not: null } } }),
    prisma.betaInvite.count({ where: { ...where, unsubscribedAt: { not: null } } }),
    prisma.betaInvite.count({ where: { ...where, activatedAt: { not: null } } }),
    prisma.betaInvite.count({ where: { ...where, failedAt: { not: null } } }),
  ]);

  // Pull every invite email once, so the terminal cross-reference and the
  // per-wave bucketing both work off the same list.
  const inviteRows = await prisma.betaInvite.findMany({
    where,
    select: { wave: true, subscriber: { select: { email: true } } },
  });
  const emails = inviteRows.map((r) => r.subscriber.email.trim().toLowerCase());
  const terminal = await crossReferenceTerminal(emails);

  // Per-wave live counts from the terminal, when reachable.
  const liveWhitelistedByWave = new Map<string, number>();
  const liveSignedInByWave = new Map<string, number>();
  if (terminal) {
    for (const r of inviteRows) {
      const e = r.subscriber.email.trim().toLowerCase();
      if (terminal.whitelisted.has(e)) {
        liveWhitelistedByWave.set(
          r.wave,
          (liveWhitelistedByWave.get(r.wave) ?? 0) + 1,
        );
      }
      if (terminal.signedIn.has(e)) {
        liveSignedInByWave.set(r.wave, (liveSignedInByWave.get(r.wave) ?? 0) + 1);
      }
    }
  }

  const liveWhitelisted = terminal ? terminal.whitelisted.size : null;
  const liveSignedIn = terminal ? terminal.signedIn.size : null;

  // The funnel the team actually cares about: who we decided to invite,
  // who can actually sign in, who got the mail, and who came back and used
  // it. "Has access" prefers the terminal's own whitelist over our local
  // bookkeeping whenever we can reach it.
  const funnel: BetaFunnelStep[] = [
    { key: "prepared", label: "Prepared", count: total },
    {
      key: "granted",
      label: "Has beta access",
      count: liveWhitelisted ?? granted,
    },
    { key: "sent", label: "Email sent", count: sent },
    { key: "delivered", label: "Delivered", count: delivered },
    {
      key: "activated",
      label: "Signed in to beta",
      count: liveSignedIn ?? activated,
    },
  ];

  // Per-wave rollout state. Grouped queries rather than one row-scan so
  // this stays cheap as the table grows.
  const groupTotals = await prisma.betaInvite.groupBy({
    by: ["wave"],
    where,
    _count: { _all: true },
  });
  const countBy = async (extra: Record<string, unknown>) =>
    prisma.betaInvite.groupBy({
      by: ["wave"],
      where: { ...where, ...extra },
      _count: { _all: true },
    });
  const [
    gGranted,
    gSent,
    gDelivered,
    gBounced,
    gComplained,
    gUnsub,
    gActivated,
  ] = await Promise.all([
    countBy({ accessGrantedAt: { not: null } }),
    countBy({ sentAt: { not: null } }),
    countBy({ deliveredAt: { not: null } }),
    countBy({ bouncedAt: { not: null } }),
    countBy({ complainedAt: { not: null } }),
    countBy({ unsubscribedAt: { not: null } }),
    countBy({ activatedAt: { not: null } }),
  ]);

  const asMap = (rows: { wave: string; _count: { _all: number } }[]) =>
    new Map(rows.map((r) => [r.wave, r._count._all]));
  const mTotal = asMap(groupTotals);
  const mGranted = asMap(gGranted);
  const mSent = asMap(gSent);
  const mDelivered = asMap(gDelivered);
  const mBounced = asMap(gBounced);
  const mComplained = asMap(gComplained);
  const mUnsub = asMap(gUnsub);
  const mActivated = asMap(gActivated);

  const waves: BetaWaveRow[] = WAVE_ORDER.map((wave) => ({
    wave,
    label: WAVE_LABELS[wave],
    total: mTotal.get(wave) ?? 0,
    granted: terminal
      ? (liveWhitelistedByWave.get(wave) ?? 0)
      : (mGranted.get(wave) ?? 0),
    sent: mSent.get(wave) ?? 0,
    delivered: mDelivered.get(wave) ?? 0,
    bounced: mBounced.get(wave) ?? 0,
    complained: mComplained.get(wave) ?? 0,
    unsubscribed: mUnsub.get(wave) ?? 0,
    activated: terminal
      ? (liveSignedInByWave.get(wave) ?? 0)
      : (mActivated.get(wave) ?? 0),
  }));

  // Daily send volume, so the ramp is visible and a day that overshot the
  // pacing plan is obvious.
  const sentRows = await prisma.betaInvite.findMany({
    where: { ...where, sentAt: { not: null } },
    select: { sentAt: true },
  });
  const dayCounts = new Map<string, number>();
  for (const r of sentRows) {
    if (!r.sentAt) continue;
    const k = dayKeyUTC(r.sentAt);
    dayCounts.set(k, (dayCounts.get(k) ?? 0) + 1);
  }
  const timeline: BetaDayPoint[] = [...dayCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, sent: count }));

  // Rates are measured against accepted sends, the same denominator Resend
  // uses. The limits shipped alongside them are Resend's own AUP ceilings,
  // which bind tighter than Gmail's 0.30% and are what would actually get
  // the account suspended.
  const bounceRate = sent > 0 ? bounced / sent : 0;
  const complaintRate = sent > 0 ? complained / sent : 0;

  // Zero recorded events means the Resend webhook is not delivering, which
  // makes every rate above a floor of zero rather than a measurement. The
  // UI surfaces this instead of showing a reassuring 0.00%.
  const emailEvents = await prisma.emailEvent.count();

  return Response.json({
    campaign: BETA_CAMPAIGN,
    funnel,
    waves,
    timeline,
    totals: {
      total,
      granted: liveWhitelisted ?? granted,
      sent,
      delivered,
      clicked,
      bounced,
      complained,
      unsubscribed,
      activated: liveSignedIn ?? activated,
      failed,
    },
    // Where the access numbers came from. `terminal` means we read the
    // login_whitelist and users tables directly; `local` means we fell back
    // to our own accessGrantedAt column, which only records that the grant
    // API returned 2xx and can drift from reality.
    accessSource: terminal ? ("terminal" as const) : ("local" as const),
    localGranted: granted,
    reputation: {
      bounceRate,
      complaintRate,
      bounceLimit: 0.04,
      complaintLimit: 0.0008,
      webhookHealthy: emailEvents > 0,
      emailEvents,
    },
  });
}
