import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import {
  FALCON_CLAIM_CAMPAIGN,
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
    delivered: number;
    bounced: number;
    complained: number;
    suppressed: number;
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
        email: true,
        falconClaimSentAt: true,
        unsubscribedAt: true,
        betaInvite: {
          select: {
            unsubscribedAt: true,
            bouncedAt: true,
            complainedAt: true,
            suppressedAt: true,
          },
        },
        surveyInvite: { select: { unsubscribedAt: true } },
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

  // The claim side lives in the TERMINAL's database, not this one. Joined on
  // the address because that is what the grant is keyed by: a tier attaches to
  // a user id, and most of this list has never signed up.
  let grantsTotal = 0;
  let claimedTotal = 0;
  let mailedWithAccount = 0;
  let mailedClaimed = 0;

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
  }

  const stats: FalconClaimStats = {
    send: {
      listTotal,
      mailed,
      pending,
      unmailable,
      delivered: c.falconClaimDeliveredAt,
      bounced: c.falconClaimBouncedAt,
      complained: c.falconClaimComplainedAt,
      suppressed: c.falconClaimSuppressedAt,
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
    unmeasured: [
      {
        metric: "Opens",
        reason:
          "Open tracking was off for this send. It works by embedding a tracking pixel, which is itself a Promotions-tab signal, so the campaign chose deliverability over the metric. It cannot be recovered after the fact.",
      },
      {
        metric: "Clicks",
        reason:
          "Click tracking was off for the same reason: it rewrites every link through a redirect domain. The earlier beta invites carried a per-recipient token for first-party attribution; this mail's CTA is a plain link, so there is nothing to attribute against.",
      },
      {
        metric: "Inbox vs Promotions vs Spam",
        reason:
          "Not knowable by any sender. No mailbox provider reports placement back, and no ESP can see it. It can only be sampled with seed accounts you control across providers.",
      },
    ],
    generatedAt: new Date().toISOString(),
  };

  return Response.json(stats);
}
