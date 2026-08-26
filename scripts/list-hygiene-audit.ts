// Read-only forensics on list quality. Answers two questions before we
// mail 10k people:
//   1. Did the Resend webhook ever actually record events? (0 bounces on a
//      10k send is not physically possible - it means we are flying blind.)
//   2. Which chunks of the list are bot/referral-farm signups that will
//      hard-bounce and torch domain reputation?
//
//   pnpm exec tsx scripts/list-hygiene-audit.ts

import "dotenv/config";

import { getPrismaClient } from "../src/lib/prisma";

async function main() {
  const prisma = getPrismaClient();

  // --- 1. Webhook health -------------------------------------------------
  const eventTotal = await prisma.emailEvent.count();
  const byType = await prisma.$queryRaw<{ type: string; n: bigint }[]>`
    SELECT type, count(*) AS n FROM "EmailEvent" GROUP BY 1 ORDER BY n DESC
  `;
  console.log("\n=== 1. Resend webhook health ===\n");
  console.log(`EmailEvent rows total: ${eventTotal}`);
  if (eventTotal === 0) {
    console.log("  !! ZERO webhook events. The webhook is NOT wired up.");
    console.log("  !! We have no bounce/complaint visibility at all.");
  }
  for (const r of byType) console.log(`  ${r.type.padEnd(24)} ${r.n}`);

  const delivered = await prisma.surveyInvite.count({
    where: { deliveredAt: { not: null } },
  });
  const opened = await prisma.surveyInvite.count({
    where: { openedAt: { not: null } },
  });
  console.log(`\nSurveyInvite.deliveredAt set: ${delivered}`);
  console.log(`SurveyInvite.openedAt set:    ${opened}`);

  // --- 2. Bot / farm detection ------------------------------------------
  // Signal A: domains with many signups that are not known mail providers.
  // A real waitlist has a long tail of one-off corporate domains; 800
  // addresses on a domain nobody has heard of is a farm.
  console.log("\n=== 2. Suspicious domain clusters ===\n");
  const clusters = await prisma.$queryRaw<
    { domain: string; n: bigint; verified: bigint; referred: bigint; first: Date; last: Date }[]
  >`
    SELECT lower(split_part(email, '@', 2)) AS domain,
           count(*) AS n,
           count(*) FILTER (WHERE "isVerified") AS verified,
           count(*) FILTER (WHERE "referredById" IS NOT NULL) AS referred,
           min("createdAt") AS first,
           max("createdAt") AS last
    FROM "WaitlistSubscriber"
    GROUP BY 1
    HAVING count(*) >= 8
      AND lower(split_part(email, '@', 2)) NOT IN (
        'gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com',
        'proton.me','protonmail.com','pm.me','qq.com','mail.ru','me.com',
        'aol.com','live.com','msn.com','yandex.ru','naver.com','163.com'
      )
    ORDER BY n DESC
    LIMIT 25
  `;
  for (const c of clusters) {
    const spanMin =
      (new Date(c.last).getTime() - new Date(c.first).getTime()) / 60000;
    console.log(
      `  ${c.domain.padEnd(26)} n=${String(c.n).padStart(4)} ver=${String(
        c.verified,
      ).padStart(4)} referred=${String(c.referred).padStart(4)}  span=${spanMin.toFixed(0)}min`,
    );
  }

  // Signal B: local-part patterns. Farms generate addresses like
  // name123@, or long random strings, at machine speed.
  console.log("\n=== 3. Referral concentration (farming) ===\n");
  const topReferrers = await prisma.$queryRaw<
    { email: string; made: number; actual: bigint }[]
  >`
    SELECT s.email, s."referralsMade" AS made, count(r.id) AS actual
    FROM "WaitlistSubscriber" s
    LEFT JOIN "WaitlistSubscriber" r ON r."referredById" = s.id
    GROUP BY s.id, s.email, s."referralsMade"
    HAVING count(r.id) > 20
    ORDER BY count(r.id) DESC
    LIMIT 15
  `;
  if (topReferrers.length === 0) console.log("  (none above 20 referrals)");
  for (const r of topReferrers) {
    console.log(`  ${r.email.padEnd(40)} referred=${r.actual}`);
  }

  // Signal C: signup burst detection - many verifications in one minute
  // is automation, not humans.
  console.log("\n=== 4. Signup bursts (per-minute spikes) ===\n");
  const bursts = await prisma.$queryRaw<{ minute: Date; n: bigint }[]>`
    SELECT date_trunc('minute', "createdAt") AS minute, count(*) AS n
    FROM "WaitlistSubscriber"
    GROUP BY 1
    HAVING count(*) >= 15
    ORDER BY n DESC
    LIMIT 15
  `;
  if (bursts.length === 0) console.log("  (no minute with 15+ signups)");
  for (const b of bursts) {
    console.log(`  ${new Date(b.minute).toISOString()}  ${b.n} signups`);
  }

  // --- 5. Engagement split ----------------------------------------------
  // People who actually opened the survey link are proven-real addresses.
  // They are the safe first wave for any send.
  console.log("\n=== 5. Proven-engaged subset (safest first wave) ===\n");
  const engaged = await prisma.surveyInvite.count({
    where: { response: { isNot: null } },
  });
  const completed = await prisma.surveyInvite.count({
    where: { response: { completedAt: { not: null } } },
  });
  console.log(`Opened the survey page (real humans): ${engaged}`);
  console.log(`Completed the survey:                 ${completed}`);

  const engagedByDomain = await prisma.$queryRaw<{ domain: string; n: bigint }[]>`
    SELECT lower(split_part(w.email, '@', 2)) AS domain, count(*) AS n
    FROM "SurveyResponse" resp
    JOIN "SurveyInvite" i ON i.id = resp."inviteId"
    JOIN "WaitlistSubscriber" w ON w.id = i."subscriberId"
    GROUP BY 1 ORDER BY n DESC LIMIT 10
  `;
  console.log("\nEngaged users by domain:");
  for (const r of engagedByDomain) {
    console.log(`  ${r.domain.padEnd(28)} ${r.n}`);
  }
}

main()
  .catch((err) => {
    console.error("Audit failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await new Promise((r) => setTimeout(r, 250));
  });
