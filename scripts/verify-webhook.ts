// Proves the Resend webhook is actually delivering, end to end.
//
// This exists because "no bounces recorded" and "webhook is broken" look
// identical from the dashboard, and the survey campaign shipped 10,474
// emails before anyone noticed it was the second one. Never trust a 0.00%
// bounce rate that has not been proven by this script.
//
// What it does:
//   1. Snapshots the current EmailEvent count.
//   2. Sends one real email to an address you name.
//   3. Polls the DB until events for THAT message id appear, or it times out.
//
// A pass means the endpoint is reachable, the signature verified against
// RESEND_WEBHOOK_SECRET, and rows are being written. Anything less than a
// pass means the abort gates in send-beta-invites.ts are decorative.
//
//   pnpm exec tsx scripts/verify-webhook.ts --to you@yourdomain.com

import "dotenv/config";

import { Resend } from "resend";

import { getPrismaClient } from "../src/lib/prisma";

const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_MS = 180_000;

function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.findIndex((a) => a === "--to" || a.startsWith("--to="));
  if (idx === -1) return { to: undefined };
  const a = args[idx];
  return { to: a.includes("=") ? a.split("=")[1] : args[idx + 1] };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { to } = parseArgs();
  if (!to) {
    console.error("Usage: verify-webhook.ts --to you@yourdomain.com");
    process.exit(1);
  }

  const prisma = getPrismaClient();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error("RESEND_API_KEY and RESEND_FROM_EMAIL must be set.");
    process.exit(1);
  }

  const before = await prisma.emailEvent.count();
  console.log(`\nResend webhook verification`);
  console.log(`EmailEvent rows before: ${before}`);
  if (before === 0) {
    console.log("(zero so far, which is what we are here to change)");
  }

  console.log(`\nSending probe email to ${to} ...`);
  const resend = new Resend(apiKey);
  const sent = await resend.emails.send({
    from,
    to,
    subject: "Trenchers webhook verification probe",
    text:
      "This is an automated probe confirming that Resend webhook events " +
      "reach the Trenchers waitlist app. No action needed.",
    tags: [{ name: "campaign", value: "webhook-probe" }],
  });
  if (sent.error || !sent.data?.id) {
    console.error(`Send failed: ${sent.error?.message ?? "no id returned"}`);
    process.exit(1);
  }
  const msgId = sent.data.id;
  console.log(`Sent. Resend message id: ${msgId}`);

  console.log(
    `\nPolling for webhook events (up to ${TIMEOUT_MS / 1000}s) ...`,
  );
  const deadline = Date.now() + TIMEOUT_MS;
  const seen = new Set<string>();

  while (Date.now() < deadline) {
    const rows = await prisma.emailEvent.findMany({
      where: { resendMsgId: msgId },
      select: { type: true, occurredAt: true },
      orderBy: { occurredAt: "asc" },
    });
    for (const r of rows) {
      if (!seen.has(r.type)) {
        seen.add(r.type);
        console.log(`  received: ${r.type} at ${r.occurredAt.toISOString()}`);
      }
    }
    // email.delivered is the one that proves the full path. email.sent
    // alone can fire before the endpoint is reachable.
    if (seen.has("email.delivered")) {
      console.log("\nPASS. The webhook is delivering and rows are persisting.");
      console.log(
        "Bounce and complaint gating in send-beta-invites.ts is now live.",
      );
      return;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  const after = await prisma.emailEvent.count();
  console.error("\nFAIL. No email.delivered event arrived in time.");
  console.error(`EmailEvent rows after: ${after} (was ${before})`);
  console.error(
    seen.size > 0
      ? `Partial events seen: ${[...seen].join(", ")}`
      : "No events at all for this message id.",
  );
  console.error(
    "\nCheck, in order:\n" +
      "  1. Resend dashboard > Webhooks: endpoint is\n" +
      "     https://trenchers.ai/api/webhooks/resend and is enabled.\n" +
      "  2. RESEND_WEBHOOK_SECRET is set in the deployed environment and\n" +
      "     matches the signing secret Resend shows (starts whsec_).\n" +
      "     A mismatch returns 401 and Resend will show failed deliveries.\n" +
      "  3. The app was redeployed after setting the secret. Without the\n" +
      "     env var the route returns 503 by design.\n" +
      "  4. Resend dashboard > Webhooks > your endpoint: inspect the\n" +
      "     delivery attempts and their response codes.",
  );
  process.exit(2);
}

main()
  .catch((err) => {
    console.error("Verification crashed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await new Promise((r) => setTimeout(r, 250));
  });
