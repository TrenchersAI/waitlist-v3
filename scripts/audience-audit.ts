// Read-only audit of who is eligible for the beta-access invite.
// Never writes. Run before any send to sanity-check the audience size and
// to see how much of the list is already burned (bounced / complained /
// unsubscribed) from the survey campaign.
//
//   pnpm exec tsx scripts/audience-audit.ts

import "dotenv/config";

import { getPrismaClient } from "../src/lib/prisma";

async function main() {
  const prisma = getPrismaClient();

  const [
    total,
    verified,
    unverified,
    invites,
    sentInvites,
    bounced,
    complained,
    unsubscribed,
    surveyCompleted,
  ] = await Promise.all([
    prisma.waitlistSubscriber.count(),
    prisma.waitlistSubscriber.count({ where: { isVerified: true } }),
    prisma.waitlistSubscriber.count({ where: { isVerified: false } }),
    prisma.surveyInvite.count(),
    prisma.surveyInvite.count({ where: { sentAt: { not: null } } }),
    prisma.surveyInvite.count({ where: { bouncedAt: { not: null } } }),
    prisma.surveyInvite.count({ where: { complainedAt: { not: null } } }),
    prisma.surveyInvite.count({ where: { unsubscribedAt: { not: null } } }),
    prisma.surveyResponse.count({ where: { completedAt: { not: null } } }),
  ]);

  // The eligible pool: verified humans we have not burned. Anyone who
  // bounced, complained, or unsubscribed on the survey campaign is
  // permanently excluded - re-mailing them is what gets a domain blocked.
  const eligible = await prisma.waitlistSubscriber.count({
    where: {
      isVerified: true,
      OR: [
        { surveyInvite: null },
        {
          surveyInvite: {
            bouncedAt: null,
            complainedAt: null,
            unsubscribedAt: null,
          },
        },
      ],
    },
  });

  console.log("\n=== Waitlist v3 - beta invite audience audit ===\n");
  console.log(`Subscribers (total):        ${total}`);
  console.log(`  verified:                 ${verified}`);
  console.log(`  unverified (EXCLUDED):    ${unverified}`);
  console.log("");
  console.log(`Survey invite rows:         ${invites}`);
  console.log(`  actually sent:            ${sentInvites}`);
  console.log(`  bounced (EXCLUDE):        ${bounced}`);
  console.log(`  complained (EXCLUDE):     ${complained}`);
  console.log(`  unsubscribed (EXCLUDE):   ${unsubscribed}`);
  console.log(`  survey completed:         ${surveyCompleted}`);
  console.log("");
  console.log(`ELIGIBLE FOR BETA INVITE:   ${eligible}`);

  // Domain mix drives pacing: a list that is 70% Gmail should be throttled
  // harder than a long tail of corporate domains, because Gmail rate-limits
  // per-sender-per-hour and a burst reads as a spam cannon.
  const rows = await prisma.$queryRaw<{ domain: string; n: bigint }[]>`
    SELECT lower(split_part(email, '@', 2)) AS domain, count(*) AS n
    FROM "WaitlistSubscriber"
    WHERE "isVerified" = true
    GROUP BY 1
    ORDER BY n DESC
    LIMIT 15
  `;
  console.log("\nTop recipient domains (verified only):");
  for (const r of rows) {
    const pct = ((Number(r.n) / verified) * 100).toFixed(1);
    console.log(`  ${r.domain.padEnd(28)} ${String(r.n).padStart(5)}  ${pct}%`);
  }

  // Role//disposable addresses are bounce and complaint magnets.
  const risky = await prisma.$queryRaw<{ email: string }[]>`
    SELECT email FROM "WaitlistSubscriber"
    WHERE "isVerified" = true
      AND (
        email ~* '^(admin|info|support|sales|contact|noreply|no-reply|postmaster|abuse|webmaster|billing)@'
        OR email ~* '@(mailinator|guerrillamail|10minutemail|tempmail|yopmail|trashmail|sharklasers)\\.'
      )
    ORDER BY email
  `;
  console.log(`\nRole / disposable addresses (review before send): ${risky.length}`);
  for (const r of risky.slice(0, 20)) console.log(`  ${r.email}`);
}

main()
  .catch((err) => {
    console.error("Audit failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await new Promise((r) => setTimeout(r, 250));
  });
