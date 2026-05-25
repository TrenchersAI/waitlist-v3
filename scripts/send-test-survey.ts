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

import { Resend } from "resend";

import { sendSurveyInviteEmail } from "../src/lib/email";
import { getPrismaClient } from "../src/lib/prisma";
import { SURVEY_CAMPAIGN } from "../src/lib/survey";

// Pull the bare address out of a From header that may be either
// "Name <user@domain>" or "user@domain", then return its domain.
function domainFromAddress(fromEmail: string): string | null {
  const angle = fromEmail.match(/<([^>]+)>/);
  const addr = (angle ? angle[1] : fromEmail).trim();
  const at = addr.lastIndexOf("@");
  return at === -1 ? null : addr.slice(at + 1).toLowerCase();
}

// Preflight: ask Resend whether the From domain can actually send before
// we touch the DB or attempt a send. `capabilities.sending` is the
// authoritative flag — a domain can be `partially_verified` (e.g. DMARC
// still pending) yet already cleared to send. Exits non-zero with a clear
// message when the domain is missing or not sending-enabled.
async function preflightDomainCheck() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set — cannot send. Set it in .env.");
    process.exit(1);
  }
  if (!fromEmail) {
    console.error(
      "RESEND_FROM_EMAIL is not set — set it to an address on your verified Resend domain.",
    );
    process.exit(1);
  }
  const domain = domainFromAddress(fromEmail);
  if (!domain) {
    console.error(
      `Could not parse a domain from RESEND_FROM_EMAIL="${fromEmail}".`,
    );
    process.exit(1);
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.domains.list();
  if (error) {
    console.warn(
      `Domain preflight skipped: could not list Resend domains (${error.message}). The send below will still surface any auth/domain error.`,
    );
    return;
  }

  const domains = data?.data ?? [];
  const match = domains.find((d) => d.name.toLowerCase() === domain);

  console.log("Resend domain preflight:");
  if (!match) {
    console.error(
      `  ✗ "${domain}" is not in this Resend account. Add & verify it at https://resend.com/domains, or check that RESEND_API_KEY belongs to the right account.`,
    );
    process.exit(1);
  }
  const sending = match.capabilities?.sending ?? "disabled";
  console.log(`  domain:   ${match.name}`);
  console.log(`  status:   ${match.status}`);
  console.log(`  sending:  ${sending}`);
  if (sending !== "enabled") {
    console.error(
      `  ✗ Sending is not enabled for "${domain}" yet — Resend will reject the send. Finish verification at https://resend.com/domains.`,
    );
    process.exit(1);
  }
  console.log(`  ✓ "${domain}" is cleared to send. Proceeding…\n`);
}

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error(
      "usage: tsx scripts/send-test-survey.ts <email> [invite|reminder]",
    );
    process.exit(1);
  }
  // Second arg picks which email to test; defaults to the reminder.
  const variant = process.argv[3] === "invite" ? "invite" : "reminder";
  console.log(`Variant:     ${variant}`);

  // Fail fast (before any DB writes) if the sending domain isn't ready.
  await preflightDomainCheck();

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
    variant,
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
