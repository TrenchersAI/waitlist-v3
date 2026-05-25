// One-shot script: send the survey invite to every verified waitlist
// subscriber. Idempotent + resume-friendly:
//
//   1. Ensure every verified subscriber has a SurveyInvite row (create
//      missing ones).
//   2. Find every invite for this campaign with `sentAt: null` (covers
//      both fresh invites and prior-run failures).
//   3. Send via Resend's batch endpoint (up to 100 emails per HTTP
//      call — counts as ONE request against the 5/s rate limit).
//   4. Mark `sentAt` + `resendMsgId` on each successful row. Failures
//      stay `sentAt: null` so the next run picks them up.
//
// Usage:
//   pnpm exec tsx scripts/send-survey-batch.ts               # dry-run
//   pnpm exec tsx scripts/send-survey-batch.ts --send        # really send
//   pnpm exec tsx scripts/send-survey-batch.ts --send --limit 25
//   pnpm exec tsx scripts/send-survey-batch.ts --send --only=you@example.com
//
// Required env:
//   DATABASE_URL, RESEND_API_KEY, RESEND_FROM_EMAIL
//   NEXT_PUBLIC_SITE_URL (used for the survey + unsubscribe links)

import "dotenv/config";
import { randomBytes } from "node:crypto";

import { Resend } from "resend";

import {
  buildSurveyInviteHtml,
  buildSurveyInviteText,
} from "../src/lib/email";
import { getPrismaClient } from "../src/lib/prisma";
import { SURVEY_CAMPAIGN } from "../src/lib/survey";

// Resend's batch endpoint accepts up to 100 messages per request. We
// stay well under the 5 req/s rate limit by sleeping between batches —
// the batch itself is 1 request, so 20 batches/sec is theoretically
// fine, but a 600 ms gap is friendlier to downstream MTAs and keeps
// some headroom for any concurrent sender on the account.
const BATCH_SIZE = 100;
const SLEEP_MS_BETWEEN_BATCHES = 600;

const SUBJECT =
  "Following up, you're still being considered for priority access";

function parseArgs() {
  const args = process.argv.slice(2);
  const send = args.includes("--send");
  const limitArg = args.find((a) => a.startsWith("--limit"));
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const limit = limitArg
    ? Number((limitArg.split("=")[1] ?? args[args.indexOf(limitArg) + 1])) ||
      undefined
    : undefined;
  const only = onlyArg ? onlyArg.slice("--only=".length) : undefined;
  return { send, limit, only };
}

function generateToken() {
  // 24 random bytes → 32 base64url chars. Opaque, unguessable, safe to
  // put in an email URL.
  return randomBytes(24).toString("base64url");
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { send, limit, only } = parseArgs();
  const prisma = getPrismaClient();

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (send && (!apiKey || !fromEmail)) {
    console.error("RESEND_API_KEY and RESEND_FROM_EMAIL must be set.");
    process.exit(1);
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.WAITLIST_SITE_URL ??
    "https://trenchers.ai"
  ).replace(/\/$/, "");

  const replyTo = process.env.RESEND_REPLY_TO ?? "prakhar@trenchers.ai";

  console.log(`\nSurvey campaign: ${SURVEY_CAMPAIGN}`);
  console.log(`Site URL:        ${siteUrl}`);
  console.log(`Mode:            ${send ? "LIVE SEND" : "dry-run (use --send)"}`);
  if (only) console.log(`Only:            ${only}`);
  if (limit) console.log(`Limit:           ${limit}`);

  // Step 1: create invites for any verified subscriber that doesn't
  // have one yet. This is the slow path on a cold start; on re-runs
  // it's a no-op because the unique constraint catches any duplicate.
  const subsNeedingInvite = await prisma.waitlistSubscriber.findMany({
    where: {
      isVerified: true,
      surveyInvite: null,
      ...(only ? { email: only.toLowerCase() } : {}),
    },
    select: { id: true, email: true },
  });
  if (subsNeedingInvite.length > 0) {
    console.log(
      `\nCreating ${subsNeedingInvite.length} new SurveyInvite rows…`,
    );
    for (const s of subsNeedingInvite) {
      try {
        await prisma.surveyInvite.create({
          data: {
            campaign: SURVEY_CAMPAIGN,
            subscriberId: s.id,
            token: generateToken(),
          },
        });
      } catch (err) {
        console.warn(`  skip ${s.email}: ${(err as Error).message}`);
      }
    }
  }

  // Step 2: find every invite that still needs a send. This pool
  // contains both the brand-new invites from step 1 and any leftovers
  // from a prior crashed/rate-limited run (sentAt = null on those too).
  const pending = await prisma.surveyInvite.findMany({
    where: {
      campaign: SURVEY_CAMPAIGN,
      sentAt: null,
      unsubscribedAt: null,
      ...(only
        ? { subscriber: { email: only.toLowerCase() } }
        : {}),
    },
    include: { subscriber: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  console.log(`\nPending invites to send: ${pending.length}`);
  if (pending.length === 0) {
    console.log("Nothing to do. Exiting.");
    return;
  }

  if (!send) {
    console.log("\nDry-run. Showing first 5:");
    for (const p of pending.slice(0, 5)) {
      console.log(`  ${p.subscriber.email}`);
    }
    console.log("\nRun with --send to actually email.");
    return;
  }

  const resend = new Resend(apiKey!);

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);

    // Build the batch payload. Per-recipient: same subject, same body
    // template, unique survey + unsubscribe URLs. Tracking.open is
    // disabled per-message to avoid the 1x1 pixel that lands these in
    // Gmail's Promotions tab.
    const payload = await Promise.all(
      chunk.map(async (inv) => {
        const surveyUrl = `${siteUrl}/survey/${inv.token}`;
        const unsubscribeUrl = `${siteUrl}/api/survey/unsubscribe?token=${inv.token}`;
        const html = await buildSurveyInviteHtml({
          surveyUrl,
          unsubscribeUrl,
        });
        const text = buildSurveyInviteText({ surveyUrl, unsubscribeUrl });
        return {
          from: fromEmail!,
          to: inv.subscriber.email,
          subject: SUBJECT,
          html,
          text,
          replyTo,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "campaign", value: SURVEY_CAMPAIGN },
            { name: "inviteId", value: inv.id },
          ],
          // Per-message tracking override. Resend's TS type for batch
          // doesn't include `settings` yet, so cast through unknown to
          // keep the runtime payload while bypassing the type check.
        } as unknown as Parameters<typeof resend.batch.send>[0][number] & {
          settings: { tracking: { open: false } };
        };
      }),
    );
    // Inject the tracking-disable settings on each payload item via a
    // mutable pass so the type narrowing above doesn't lose the flag.
    for (const p of payload) {
      (p as unknown as { settings: { tracking: { open: false } } }).settings =
        { tracking: { open: false } };
    }

    try {
      const result = await resend.batch.send(payload);
      if (result.error) {
        console.warn(
          `  Batch ${i / BATCH_SIZE + 1} error: ${result.error.message}`,
        );
        failed += chunk.length;
      } else {
        // Resend returns { data: [ { id }, { id }, ... ] } aligned to
        // input order. Mark each invite as sent with its Resend id.
        const ids = result.data?.data ?? [];
        await Promise.all(
          chunk.map(async (inv, idx) => {
            const msgId = ids[idx]?.id ?? null;
            try {
              await prisma.surveyInvite.update({
                where: { id: inv.id },
                data: {
                  sentAt: new Date(),
                  resendMsgId: msgId ?? undefined,
                },
              });
              sent++;
            } catch (err) {
              console.warn(
                `  ${inv.subscriber.email}: db update failed — ${(err as Error).message}`,
              );
              failed++;
            }
          }),
        );
      }
    } catch (err) {
      // Whole batch threw (network, 5xx, etc.) — count all as failed
      // so they stay `sentAt: null` and the next run retries them.
      console.warn(
        `  Batch ${i / BATCH_SIZE + 1} threw: ${(err as Error).message}`,
      );
      failed += chunk.length;
    }

    const done = Math.min(i + BATCH_SIZE, pending.length);
    console.log(
      `Progress: ${done}/${pending.length} (sent ${sent}, failed ${failed})`,
    );

    if (i + BATCH_SIZE < pending.length) {
      await sleep(SLEEP_MS_BETWEEN_BATCHES);
    }
  }

  console.log(`\nDone. Sent ${sent}, failed ${failed}.`);
}

main()
  .catch((err) => {
    console.error("Batch send crashed:", err);
    process.exit(1);
  })
  .finally(async () => {
    // Give Prisma time to close pooled connections before the process
    // exits — otherwise tsx can hang on macOS.
    await new Promise((r) => setTimeout(r, 250));
  });
