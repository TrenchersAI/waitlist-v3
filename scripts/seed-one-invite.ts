// Dev-only helper: ensure a verified waitlist row exists for one email
// and return a survey invite token so you can open the survey page
// locally. Safe to re-run.

import "dotenv/config";
import { randomBytes } from "node:crypto";

import { getPrismaClient } from "../src/lib/prisma";

async function main() {
  const prisma = getPrismaClient();

  const email = process.argv[2] ?? "harsh2102agarwal@gmail.com";
  let sub = await prisma.waitlistSubscriber.findUnique({ where: { email } });
  if (!sub) {
    sub = await prisma.waitlistSubscriber.create({
      data: {
        email,
        referralCode: Math.random().toString(36).slice(2, 10),
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
    console.log("Created subscriber:", sub.id);
  } else {
    console.log("Found subscriber:", sub.id, "verified:", sub.isVerified);
    if (!sub.isVerified) {
      await prisma.waitlistSubscriber.update({
        where: { id: sub.id },
        data: { isVerified: true, verifiedAt: new Date() },
      });
    }
  }

  const existing = await prisma.surveyInvite.findUnique({
    where: { subscriberId: sub.id },
  });
  if (existing) {
    console.log("INVITE_TOKEN=" + existing.token);
  } else {
    const inv = await prisma.surveyInvite.create({
      data: {
        campaign: "trader-research-v1",
        subscriberId: sub.id,
        token: randomBytes(24).toString("base64url"),
      },
    });
    console.log("INVITE_TOKEN=" + inv.token);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
