import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import {
  FALCON_CLAIM_CAMPAIGN,
  AUDIENCE_SELECT,
  isMailable,
  isPending,
  isSuppressed,
} from "@/src/lib/falcon-claim-audience";
import { getPrismaClient } from "@/src/lib/prisma";
import { getTrenchersPool } from "@/src/lib/trenchers-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Falcon CLAIM campaign — the whole-list public-beta send.
//
// EVERY NUMBER HERE IS OBSERVED, NOTHING IS ESTIMATED. Sends and delivery
// outcomes come from Resend's own webhook events; claims and accounts come from
// the terminal's database. Where something CANNOT be known it is reported as
// unavailable with the reason, never as a zero -- a zero next to a real metric
// reads as "nobody did this" when the truth is "we did not measure it", and
// that difference changes what you would do next.
//
// WHAT CANNOT BE KNOWN FOR THIS SEND, and why:
//
//   opens   — open tracking was OFF. It works by embedding a tracking pixel,
//             which is itself a Promotions-tab signal, so this campaign chose
//             deliverability over the metric. Nothing was recorded, and it
//             cannot be recovered after the fact.
//   clicks  — click tracking was OFF for the same reason (it rewrites every
//             link through a redirect domain). The earlier beta invites got
//             first-party click attribution from a per-recipient token in the
//             URL; this mail's CTA is a plain link, so there is no token to
//             attribute against.
//   inbox vs Promotions vs Spam — NOT KNOWABLE, by anyone. No mailbox provider
//             reports placement back to a sender, and no ESP can see it either.
//             It can only be sampled with seed accounts you control across
//             providers. Any product claiming to show this for a real list is
//             extrapolating from a seed panel.
//
// The claim rate is the honest substitute for all three: someone who claims
// necessarily received, opened, and acted on the mail.

export type FalconClaimStats = {
  send: {
    listTotal: number;
    mailed: number;
    pending: number;
    unmailable: number;
    /// Pending, broken down by the wave each person belongs to.
    ///
    /// The sender's `--exclude-waves` is a PER-RUN operator choice and is
    /// persisted nowhere, so this route cannot know a future run will skip a
    /// wave -- reporting a single "still to send" number therefore overstates
    /// what the campaign will actually process. Rather than guess, the number
    /// is shown with its composition, so an operator who excluded a wave can
    /// see exactly how much of the remainder is that wave.
    pendingByWave: { wave: string; n: number }[];
    delivered: number;
    bounced: number;
    complained: number;
    suppressed: number;
    opened: number;
    clicked: number;
    openRate: number | null;
    clickRate: number | null;
    openTracked: boolean;
    clickTracked: boolean;
    deliveryRate: number | null;
    bounceRate: number | null;
    complaintRate: number | null;
    bounceLimit: number;
    complaintLimit: number;
    progress: number;
  };
  claim: {
    grantsTotal: number;
    claimedTotal: number;
    mailedWithAccount: number;
    mailedClaimed: number;
    accountRate: number | null;
    claimRateOfMailed: number | null;
    claimRateOfAccounts: number | null;
  };
  /// Response ATTRIBUTED to the mail by timestamp, not inferred. A signup or a
  /// claim that happened AFTER this address was mailed is one the mail could
  /// have caused; one that happened before it plainly could not. This is what
  /// stands in for the click-through the send did not instrument -- weaker
  /// than a tracked click, but real, and it measures the thing that actually
  /// matters rather than the thing that is easy to count.
  attribution: {
    hadAccountBefore: number;
    signedUpAfter: number;
    claimedAfter: number;
    signupRateOfNoAccount: number | null;
    claimRateOfReachable: number | null;
  };
  unmeasured: { metric: string; reason: string }[];
  generatedAt: string;
};

const rate = (n: number, d: number) => (d > 0 ? n / d : null);

export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const prisma = getPrismaClient();

  const [agg, everyone] = await Promise.all([
    prisma.waitlistSubscriber.aggregate({
      _count: {
        falconClaimSentAt: true,
        falconClaimDeliveredAt: true,
        falconClaimBouncedAt: true,
        falconClaimComplainedAt: true,
        falconClaimSuppressedAt: true,
        falconClaimOpenedAt: true,
        falconClaimClickedAt: true,
      },
    }),
    // The whole list, then counted with the SENDER's own predicate. Counting
    // pending in SQL with a looser condition is what produced the bug this
    // replaces: rows suppressed through an invite, or holding an address the
    // sender refuses, were reported as "still to send" even though nothing
    // would ever process them, and `unmailable` was then derived by
    // subtraction from that wrong number. 14,199 rows is nothing to hold.
    prisma.waitlistSubscriber.findMany({
      select: {
        ...AUDIENCE_SELECT,
        betaInvite: { select: { ...AUDIENCE_SELECT.betaInvite.select, wave: true } },
      },
    }),
  ]);

  const c = agg._count;
  const mailed = c.falconClaimSentAt;
  const listTotal = everyone.length;
  const pending = everyone.filter(isPending).length;
  // Counted directly, never inferred: an address the sender will not touch is
  // a fact about the row, not the remainder of two other numbers.
  const unmailable = everyone.filter(
    (r) => r.falconClaimSentAt == null && !isSuppressed(r) && !isMailable(r.email),
  ).length;
  const mailedRows = everyone.filter((r) => r.falconClaimSentAt != null);
  const waveCounts = new Map<string, number>();
  for (const r of everyone) {
    if (!isPending(r)) continue;
    const w = r.betaInvite?.wave ?? "(no invite)";
    waveCounts.set(w, (waveCounts.get(w) ?? 0) + 1);
  }
  const pendingByWave = [...waveCounts]
    .map(([wave, n]) => ({ wave, n }))
    .sort((a, b) => b.n - a.n);

  // The claim side lives in the TERMINAL's database, not this one. Joined on
  // the address because that is what the grant is keyed by: a tier attaches to
  // a user id, and most of this list has never signed up.
  let grantsTotal = 0;
  let claimedTotal = 0;
  let mailedWithAccount = 0;
  let mailedClaimed = 0;
  let hadAccountBefore = 0;
  let signedUpAfter = 0;
  let claimedAfter = 0;

  const pool = getTrenchersPool();
  if (pool) {
    const emails = mailedRows.map((r) => r.email.toLowerCase());
    const [all, mine, accounts] = await Promise.all([
      // Scoped to THIS campaign. `tier_claim_grants` is explicitly designed
      // to hold more than one at a time -- that is why it has a `campaign`
      // column and why the seed writes one -- so an unscoped count would fold
      // a future campaign's claims into these rates and silently overstate
      // how well this mail worked.
      pool.query<{ total: string; claimed: string }>(
        `SELECT count(*)::text AS total,
                count(*) FILTER (WHERE claimed_at IS NOT NULL)::text AS claimed
           FROM tier_claim_grants WHERE campaign = $1`,
        [FALCON_CLAIM_CAMPAIGN],
      ),
      emails.length
        ? pool.query<{ claimed: string }>(
            `SELECT count(*) FILTER (WHERE claimed_at IS NOT NULL)::text AS claimed
               FROM tier_claim_grants
              WHERE campaign = $2 AND email = ANY($1::text[])`,
            [emails, FALCON_CLAIM_CAMPAIGN],
          )
        : Promise.resolve({ rows: [{ claimed: "0" }] }),
      emails.length
        ? pool.query<{ n: string }>(
            `SELECT count(DISTINCT lower(email))::text AS n FROM users
              WHERE lower(email) = ANY($1::text[])`,
            [emails],
          )
        : Promise.resolve({ rows: [{ n: "0" }] }),
    ]);
    grantsTotal = Number(all.rows[0]?.total ?? 0);
    claimedTotal = Number(all.rows[0]?.claimed ?? 0);
    mailedClaimed = Number(mine.rows[0]?.claimed ?? 0);
    mailedWithAccount = Number(accounts.rows[0]?.n ?? 0);

    // Attribution by timestamp. `min(created_at)` because a few addresses have
    // more than one account, and the FIRST one is what decides whether this
    // person already had somewhere to claim into when the mail arrived.
    const sentAt = new Map<string, Date>();
    for (const r of mailedRows) {
      if (r.falconClaimSentAt) sentAt.set(r.email.toLowerCase(), r.falconClaimSentAt);
    }
    const [signups, claims] = await Promise.all([
      pool.query<{ email: string; created_at: Date }>(
        `SELECT lower(email) AS email, min(created_at) AS created_at FROM users
          WHERE lower(email) = ANY($1::text[]) GROUP BY 1`,
        [emails],
      ),
      pool.query<{ email: string; claimed_at: Date }>(
        `SELECT email, claimed_at FROM tier_claim_grants
          WHERE campaign = $2 AND claimed_at IS NOT NULL AND email = ANY($1::text[])`,
        [emails, FALCON_CLAIM_CAMPAIGN],
      ),
    ]);
    for (const r of signups.rows) {
      const t = sentAt.get(r.email);
      if (!t) continue;
      if (new Date(r.created_at) > t) signedUpAfter += 1;
      else hadAccountBefore += 1;
    }
    for (const r of claims.rows) {
      const t = sentAt.get(r.email);
      if (t && new Date(r.claimed_at) > t) claimedAfter += 1;
    }
  }

  const stats: FalconClaimStats = {
    send: {
      listTotal,
      mailed,
      pending,
      unmailable,
      pendingByWave,
      delivered: c.falconClaimDeliveredAt,
      bounced: c.falconClaimBouncedAt,
      complained: c.falconClaimComplainedAt,
      suppressed: c.falconClaimSuppressedAt,
      opened: c.falconClaimOpenedAt,
      clicked: c.falconClaimClickedAt,
      openRate: rate(c.falconClaimOpenedAt, c.falconClaimDeliveredAt),
      clickRate: rate(c.falconClaimClickedAt, c.falconClaimDeliveredAt),
      // A flat zero means "not measured" for these two, and the UI has to say
      // which -- so it is told, rather than left to guess from the number.
      openTracked: c.falconClaimOpenedAt > 0,
      clickTracked: c.falconClaimClickedAt > 0,
      deliveryRate: rate(c.falconClaimDeliveredAt, mailed),
      bounceRate: rate(c.falconClaimBouncedAt, mailed),
      complaintRate: rate(c.falconClaimComplainedAt, mailed),
      // The same thresholds the sender's own mid-flight abort uses, so the
      // dashboard and the script cannot disagree about what "too high" means.
      bounceLimit: 0.04,
      complaintLimit: 0.001,
      progress: listTotal > 0 ? mailed / listTotal : 0,
    },
    claim: {
      grantsTotal,
      claimedTotal,
      mailedWithAccount,
      mailedClaimed,
      accountRate: rate(mailedWithAccount, mailed),
      claimRateOfMailed: rate(mailedClaimed, mailed),
      // The rate that actually measures the mail's persuasion: of the people
      // who could claim in one click because they already have an account,
      // how many did.
      claimRateOfAccounts: rate(mailedClaimed, mailedWithAccount),
    },
    attribution: {
      hadAccountBefore,
      signedUpAfter,
      claimedAfter,
      // Of the people who had NOWHERE to claim into when the mail landed, how
      // many went and made one. The hardest ask in the campaign.
      signupRateOfNoAccount: rate(signedUpAfter, Math.max(0, mailed - hadAccountBefore)),
      // Of everyone who could act -- already had an account, or made one after
      // the mail -- how many actually claimed.
      claimRateOfReachable: rate(claimedAfter, hadAccountBefore + signedUpAfter),
    },
    unmeasured: [
      ...(c.falconClaimOpenedAt > 0
        ? []
        : [
            {
              metric: "Opens",
              reason:
                "Open tracking was off for the send that has run so far. It works by embedding a pixel, which is itself a Promotions-tab signal, so it is a per-send choice. It is now supported: run the sender with --track-opens and this fills in. It cannot be recovered for mail already delivered.",
            },
          ]),
      ...(c.falconClaimClickedAt > 0
        ? []
        : [
            {
              metric: "Clicks",
              reason:
                "The mail that has gone out carries a plain CTA, so there is nothing to attribute against. The template is now tokenised and /api/claim/[token] records the first click first-party, without the ESP link rewriting that costs deliverability. Future sends fill this in.",
            },
          ]),
      {
        metric: "Inbox vs Promotions vs Spam",
        reason:
          "Not knowable by any sender. No mailbox provider reports placement back, and no ESP can see it. The only real method is a seed panel: accounts you control across Gmail, Outlook and Yahoo, included in the send and checked by hand or over IMAP.",
      },
    ],
    generatedAt: new Date().toISOString(),
  };

  return Response.json(stats);
}
