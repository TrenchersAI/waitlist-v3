// Paced, resumable, wave-by-wave sender for the beta-access invite.
//
// Safety model, in priority order:
//
//   1. ABORT ON REPUTATION. Before every batch we recompute live bounce and
//      complaint rates from BetaInvite and stop if either crosses the
//      threshold. The binding limits are Resend's own AUP, not Google's:
//      bounce < 4% and complaint < 0.08%, and Resend states an account
//      "may be shutdown without warning" above them. Their 0.08% complaint
//      ceiling is nearly 4x stricter than Gmail's 0.30%, so it is what we
//      gate on.
//   2. ONE WAVE AT A TIME. The wave must be named explicitly. There is no
//      "send to everyone" mode, on purpose - see src/lib/beta-invite.ts for
//      why the tail of this list is dangerous.
//   3. RESUMABLE + IDEMPOTENT. sentAt is stamped per recipient, so a crash
//      or a re-run continues rather than double-sending.
//   4. DRY-RUN BY DEFAULT. Nothing leaves the building without --send.
//
// Pacing: Resend allows 10 req/s per team and 100 emails per batch call,
// which is a theoretical 1,000 emails/second. That is a hazard, not a
// feature. We cap at ~1,000/hour by sleeping between batches so bounce
// webhooks have time to land and be counted by the next batch's gate.
//
//   pnpm exec tsx scripts/send-beta-invites.ts --wave wave-1-completed
//   pnpm exec tsx scripts/send-beta-invites.ts --wave wave-1-completed --send --limit 500

import "dotenv/config";

import { Resend } from "resend";

import {
  BETA_INVITE_SUBJECT,
  buildBetaInviteHtml,
  buildBetaInviteText,
} from "../src/lib/email";
import { BETA_CAMPAIGN, WAVE_ORDER, type InviteWave } from "../src/lib/beta-invite";
import { getPrismaClient } from "../src/lib/prisma";

/// Resend's published ceilings. Crossing either risks the account, so we
/// stop well before: the pause thresholds below are deliberately set at
/// half of Resend's limit to leave room to investigate.
const RESEND_BOUNCE_LIMIT = 0.04;
const RESEND_COMPLAINT_LIMIT = 0.0008;
const BOUNCE_PAUSE_AT = 0.02;
const COMPLAINT_PAUSE_AT = 0.0004;

/// Do not evaluate rates until we have enough delivered mail for them to
/// mean anything. At n=100, a single complaint reads as 1% and would abort
/// a healthy send.
const MIN_SAMPLE_FOR_RATE_GATE = 500;

const BATCH_SIZE = 100; // Resend's hard max per batch call.
const TARGET_PER_HOUR = 1000;
const SLEEP_MS_BETWEEN_BATCHES = Math.ceil(
  (3600 * 1000) / (TARGET_PER_HOUR / BATCH_SIZE),
);

function parseArgs() {
  const args = process.argv.slice(2);
  const send = args.includes("--send");

  const readValue = (flag: string) => {
    const idx = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
    if (idx === -1) return undefined;
    const a = args[idx];
    return a.includes("=") ? a.split("=").slice(1).join("=") : args[idx + 1];
  };

  const wave = readValue("--wave") as InviteWave | undefined;
  const limitRaw = readValue("--limit");
  const limit = limitRaw ? Number(limitRaw) : Infinity;
  return { send, wave, limit };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/// Live reputation snapshot across everything already sent in this
/// campaign. Rates are computed against messages Resend accepted, which is
/// the denominator Resend itself uses.
async function reputationSnapshot() {
  const prisma = getPrismaClient();
  const [sent, bounced, complained, unsubscribed] = await Promise.all([
    prisma.betaInvite.count({
      where: { campaign: BETA_CAMPAIGN, sentAt: { not: null } },
    }),
    prisma.betaInvite.count({
      where: { campaign: BETA_CAMPAIGN, bouncedAt: { not: null } },
    }),
    prisma.betaInvite.count({
      where: { campaign: BETA_CAMPAIGN, complainedAt: { not: null } },
    }),
    prisma.betaInvite.count({
      where: { campaign: BETA_CAMPAIGN, unsubscribedAt: { not: null } },
    }),
  ]);
  return {
    sent,
    bounced,
    complained,
    unsubscribed,
    bounceRate: sent > 0 ? bounced / sent : 0,
    complaintRate: sent > 0 ? complained / sent : 0,
  };
}

type GateResult = { ok: true } | { ok: false; reason: string };

function evaluateGate(snap: Awaited<ReturnType<typeof reputationSnapshot>>): GateResult {
  if (snap.sent < MIN_SAMPLE_FOR_RATE_GATE) return { ok: true };
  if (snap.bounceRate >= BOUNCE_PAUSE_AT) {
    return {
      ok: false,
      reason:
        `bounce rate ${(snap.bounceRate * 100).toFixed(2)}% >= pause threshold ` +
        `${(BOUNCE_PAUSE_AT * 100).toFixed(2)}% (Resend hard limit ${(
          RESEND_BOUNCE_LIMIT * 100
        ).toFixed(0)}%)`,
    };
  }
  if (snap.complaintRate >= COMPLAINT_PAUSE_AT) {
    return {
      ok: false,
      reason:
        `complaint rate ${(snap.complaintRate * 100).toFixed(3)}% >= pause threshold ` +
        `${(COMPLAINT_PAUSE_AT * 100).toFixed(3)}% (Resend hard limit ${(
          RESEND_COMPLAINT_LIMIT * 100
        ).toFixed(2)}%)`,
    };
  }
  return { ok: true };
}

/// Warns loudly if the webhook has never recorded an event. Without it,
/// bounced/complained stay 0 forever and the gate above is decorative  - 
/// which is exactly what happened on the previous 10,474-email survey send.
async function assertWebhookAlive(sentSoFar: number) {
  const prisma = getPrismaClient();
  const events = await prisma.emailEvent.count();
  if (events === 0 && sentSoFar > 0) {
    throw new Error(
      "No EmailEvent rows exist but mail has already been sent. The Resend " +
        "webhook is not delivering, so bounce and complaint gating cannot " +
        "work. Configure the webhook (and RESEND_WEBHOOK_SECRET) before " +
        "sending more.",
    );
  }
  if (events === 0) {
    console.warn(
      "\n  WARNING: zero EmailEvent rows. If the Resend webhook is not\n" +
        "  configured, this send will be unmonitored and the abort gate\n" +
        "  will never fire. Verify the webhook before a large wave.\n",
    );
  }
}

async function main() {
  const { send, wave, limit } = parseArgs();
  const prisma = getPrismaClient();

  if (!wave || !WAVE_ORDER.includes(wave)) {
    console.error(
      `--wave is required and must be one of:\n  ${WAVE_ORDER.join("\n  ")}`,
    );
    process.exit(1);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (send && (!apiKey || !fromEmail)) {
    console.error("RESEND_API_KEY and RESEND_FROM_EMAIL must be set.");
    process.exit(1);
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://trenchers.ai"
  ).replace(/\/$/, "");
  const accessUrl = process.env.BETA_ACCESS_URL ?? "https://beta.trenchers.ai";
  const replyTo = process.env.RESEND_REPLY_TO ?? "team@trenchers.ai";

  const snap = await reputationSnapshot();
  console.log(`\nBeta invite sender - ${BETA_CAMPAIGN} - ${new Date().toISOString()}`);
  console.log(`Mode:            ${send ? "LIVE SEND" : "dry-run (use --send)"}`);
  console.log(`Wave:            ${wave}`);
  console.log(
    `Already sent:    ${snap.sent} (bounced ${snap.bounced}, complained ${snap.complained}, unsub ${snap.unsubscribed})`,
  );
  if (snap.sent > 0) {
    console.log(
      `Rates:           bounce ${(snap.bounceRate * 100).toFixed(2)}%, complaint ${(
        snap.complaintRate * 100
      ).toFixed(3)}%`,
    );
  }

  if (send) await assertWebhookAlive(snap.sent);

  const gate = evaluateGate(snap);
  if (!gate.ok) {
    console.error(`\nABORT: ${gate.reason}`);
    console.error("Investigate before sending anything further.");
    process.exit(2);
  }

  // Nobody gets an email saying "your access is open" unless access has
  // actually been provisioned. The terminal is default-deny, so sending
  // first would land the recipient on a "you're not on the list" screen  - 
  // the single worst outcome available here, and one that generates
  // support load and spam complaints in equal measure.
  const ungranted = await prisma.betaInvite.count({
    where: {
      campaign: BETA_CAMPAIGN,
      wave,
      sentAt: null,
      unsubscribedAt: null,
      accessGrantedAt: null,
    },
  });
  if (ungranted > 0) {
    console.error(
      `\nABORT: ${ungranted} recipients in ${wave} have no accessGrantedAt.\n` +
        `Run scripts/grant-beta-access.ts --wave ${wave} --grant first.`,
    );
    process.exit(3);
  }

  // Pending = in this wave, access granted, never sent, never failed, not
  // suppressed.
  const pending = await prisma.betaInvite.findMany({
    where: {
      campaign: BETA_CAMPAIGN,
      wave,
      accessGrantedAt: { not: null },
      sentAt: null,
      failedAt: null,
      unsubscribedAt: null,
      bouncedAt: null,
      complainedAt: null,
    },
    include: { subscriber: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
    take: Number.isFinite(limit) ? limit : undefined,
  });

  console.log(`Pending in wave: ${pending.length}`);
  if (pending.length === 0) {
    console.log("\nNothing to send. Exiting.");
    return;
  }

  if (!send) {
    console.log("\nDry-run. First 5 recipients:");
    for (const p of pending.slice(0, 5)) console.log(`  ${p.subscriber.email}`);
    console.log(
      `\nWould send ${pending.length} in ${Math.ceil(
        pending.length / BATCH_SIZE,
      )} batches of ${BATCH_SIZE}, ~${(
        (pending.length / TARGET_PER_HOUR) * 60
      ).toFixed(0)} minutes at ${TARGET_PER_HOUR}/hour.`,
    );
    console.log("Run with --send to actually email.");
    return;
  }

  const resend = new Resend(apiKey!);
  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    // Re-gate before every batch so a complaint spike mid-wave stops the
    // rest of the run rather than only the next wave.
    const live = await reputationSnapshot();
    const liveGate = evaluateGate(live);
    if (!liveGate.ok) {
      console.error(`\nABORT mid-wave: ${liveGate.reason}`);
      console.error(`Stopped after ${sentCount} sends in this run.`);
      process.exit(2);
    }

    const batch = pending.slice(i, i + BATCH_SIZE);
    const payload = await Promise.all(
      batch.map(async (row) => {
        const unsubscribeUrl = `${siteUrl}/api/survey/unsubscribe?token=${row.token}&c=beta`;
        const copy = {
          accessUrl,
          unsubscribeUrl,
          recipientEmail: row.subscriber.email,
        };
        return {
          from: fromEmail!,
          to: row.subscriber.email,
          subject: BETA_INVITE_SUBJECT,
          html: await buildBetaInviteHtml(copy),
          text: buildBetaInviteText(copy),
          replyTo,
          headers: {
            // RFC 8058. Required by Gmail and Yahoo for bulk senders, and
            // a complaint-rate reducer regardless: someone who can leave
            // in one click does not reach for the spam button.
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "campaign", value: BETA_CAMPAIGN },
            { name: "inviteId", value: row.id },
            { name: "wave", value: wave },
          ],
          // Both trackers off. The open pixel and the click-tracking URL
          // rewrite (which repoints links at a Resend-controlled domain
          // whose reputation is pooled across tenants) are two of the
          // clearest bulk-marketing signals available. Activation is
          // measured server-side from beta sign-ins instead.
          settings: { tracking: { open: false, click: false } },
        };
      }),
    );

    const batchNo = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(pending.length / BATCH_SIZE);
    try {
      const result = await resend.batch.send(
        payload as unknown as Parameters<typeof resend.batch.send>[0],
      );
      if (result.error) {
        console.warn(`  batch ${batchNo}: error - ${result.error.message}`);
        await prisma.betaInvite.updateMany({
          where: { id: { in: batch.map((b) => b.id) } },
          data: { failedAt: new Date(), failReason: result.error.message },
        });
        failedCount += batch.length;
      } else {
        const ids = result.data?.data ?? [];
        await Promise.all(
          batch.map(async (row, idx) => {
            try {
              await prisma.betaInvite.update({
                where: { id: row.id },
                data: {
                  sentAt: new Date(),
                  resendMsgId: ids[idx]?.id ?? undefined,
                },
              });
              sentCount++;
            } catch (err) {
              console.warn(
                `    ${row.subscriber.email}: db update failed - ${
                  (err as Error).message
                }`,
              );
              failedCount++;
            }
          }),
        );
      }
    } catch (err) {
      console.warn(`  batch ${batchNo}: threw - ${(err as Error).message}`);
      failedCount += batch.length;
    }

    console.log(
      `  batch ${batchNo}/${totalBatches} done - sent ${sentCount}, failed ${failedCount}`,
    );

    if (i + BATCH_SIZE < pending.length) {
      await sleep(SLEEP_MS_BETWEEN_BATCHES);
    }
  }

  const final = await reputationSnapshot();
  console.log(`\nWave ${wave} run complete. Sent ${sentCount}, failed ${failedCount}.`);
  console.log(
    `Campaign totals: sent ${final.sent}, bounced ${final.bounced} (${(
      final.bounceRate * 100
    ).toFixed(2)}%), complained ${final.complained} (${(
      final.complaintRate * 100
    ).toFixed(3)}%).`,
  );
  console.log(
    "\nWait for bounce/complaint webhooks to settle (a few hours) before " +
      "starting the next wave.",
  );
}

main()
  .catch((err) => {
    console.error("Send crashed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await new Promise((r) => setTimeout(r, 250));
  });
