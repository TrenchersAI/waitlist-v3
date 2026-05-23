// Send ONE test survey email. Idempotent — reuses an existing invite for
// the email if there is one, otherwise creates the subscriber + invite.
// Site URL is read from SURVEY_TEST_SITE_URL so we can override it per
// send without touching .env.
//
// Usage:
//   SURVEY_TEST_SITE_URL=https://your-tunnel.loca.lt \
//     pnpm exec tsx scripts/send-test-survey.ts harsh@trenchers.ai

import "dotenv/config";
import { randomBytes } from "node:crypto";

import { sendSurveyInviteEmail } from "../src/lib/email";
import { getPrismaClient } from "../src/lib/prisma";
import { SURVEY_CAMPAIGN } from "../src/lib/survey";

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("usage: tsx scripts/send-test-survey.ts <email>");
    process.exit(1);
  }

  const siteUrl =
    process.env.SURVEY_TEST_SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://trenchers.ai";

  const prisma = getPrismaClient();

  // Ensure subscriber exists and is verified.
  let sub = await prisma.waitlistSubscriber.findUnique({
    where: { email: to },
  });
  if (!sub) {
    sub = await prisma.waitlistSubscriber.create({
      data: {
        email: to,
        referralCode: randomBytes(4).toString("hex"),
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
  } else if (!sub.isVerified) {
    await prisma.waitlistSubscriber.update({
      where: { id: sub.id },
      data: { isVerified: true, verifiedAt: new Date() },
    });
  }

  // Reuse the invite if it already exists; otherwise create one. We
  // intentionally do not bump `sentAt` again on reuse — re-runs should
  // produce a fresh email but keep the original click/sent telemetry
  // intact.
  let invite = await prisma.surveyInvite.findUnique({
    where: { subscriberId: sub.id },
  });
  if (!invite) {
    invite = await prisma.surveyInvite.create({
      data: {
        campaign: SURVEY_CAMPAIGN,
        subscriberId: sub.id,
        token: randomBytes(24).toString("base64url"),
      },
    });
  }

  const surveyUrl = `${siteUrl.replace(/\/$/, "")}/survey/${invite.token}`;
  const unsubscribeUrl = `${siteUrl.replace(/\/$/, "")}/api/survey/unsubscribe?token=${invite.token}`;

  console.log(`To:          ${to}`);
  console.log(`Site URL:    ${siteUrl}`);
  console.log(`Survey URL:  ${surveyUrl}`);
  console.log(`Invite ID:   ${invite.id}`);
  console.log(`Token:       ${invite.token}`);
  console.log("");
  console.log("Sending via Resend…");

  const result = await sendSurveyInviteEmail({
    to,
    surveyUrl,
    unsubscribeUrl,
    inviteId: invite.id,
    campaign: invite.campaign,
  });

  if ("skipped" in result) {
    console.error("Send skipped: RESEND_API_KEY missing.");
    process.exit(1);
  }

  await prisma.surveyInvite.update({
    where: { id: invite.id },
    data: {
      sentAt: invite.sentAt ?? new Date(),
      resendMsgId: result.id ?? invite.resendMsgId,
    },
  });

  console.log(`✓ Sent. Resend message id: ${result.id}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Send failed:", err);
  process.exit(1);
});
