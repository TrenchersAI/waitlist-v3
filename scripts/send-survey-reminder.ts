// Reminder pass: a second, gentler send to everyone who got the first
// survey invite but hasn't completed the survey. Distinct from the invite
// blast (scripts/send-survey-batch.ts) — this one re-emails already-sent
// invites with the "reminder" copy, paced over a window for deliverability.
//
// Audience (per campaign): sentAt != null, reminderSentAt == null, not
// unsubscribed / bounced / complained, and the survey isn't completed.
//
// Idempotent + resumable: each success stamps `reminderSentAt`, so a run
// that dies partway can simply be re-run and it picks up the rest.
//
// Usage:
//   pnpm exec tsx scripts/send-survey-reminder.ts                 # dry-run
//   pnpm exec tsx scripts/send-survey-reminder.ts --send          # send, 10h drip
//   pnpm exec tsx scripts/send-survey-reminder.ts --send --over-hours 10 --batch 25
//   pnpm exec tsx scripts/send-survey-reminder.ts --send --limit 50
//   pnpm exec tsx scripts/send-survey-reminder.ts --send --only=you@example.com
//
// Required env: DATABASE_URL, RESEND_API_KEY, RESEND_FROM_EMAIL,
//   NEXT_PUBLIC_SITE_URL (survey + unsubscribe links), optional RESEND_REPLY_TO.

import "dotenv/config";

import { Resend } from "resend";

import {
  buildSurveyInviteHtml,
  buildSurveyInviteText,
} from "../src/lib/email";
import { getPrismaClient } from "../src/lib/prisma";
import { SURVEY_CAMPAIGN } from "../src/lib/survey";

const SUBJECT = "You're still being considered for priority access";

// Resend's batch endpoint accepts up to 100 messages per request, but for a
// reminder we deliberately send small chunks spaced out over the window so
// the send looks like a steady trickle rather than a bulk blast.
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_OVER_HOURS = 10;

function parseArgs() {
  const args = process.argv.slice(2);
  const send = args.includes("--send");
  const num = (flag: string, fallback: number) => {
    const a = args.find((x) => x.startsWith(`${flag}=`) || x === flag);
    if (!a) return fallback;
    const inline = a.includes("=") ? a.split("=")[1] : args[args.indexOf(a) + 1];
    const n = Number(inline);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const limitArg = args.find((a) => a.startsWith("--limit"));
  const limit = limitArg
    ? Number(limitArg.includes("=") ? limitArg.split("=")[1] : args[args.indexOf(limitArg) + 1]) ||
      undefined
    : undefined;
  return {
    send,
    overHours: num("--over-hours", DEFAULT_OVER_HOURS),
    batchSize: Math.min(100, num("--batch", DEFAULT_BATCH_SIZE)),
    only: onlyArg ? onlyArg.slice("--only=".length) : undefined,
    limit,
  };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { send, overHours, batchSize, only, limit } = parseArgs();
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

  // Reminder audience: already sent the first invite, still reachable, and
  // hasn't completed the survey.
  const pending = await prisma.surveyInvite.findMany({
    where: {
      campaign: SURVEY_CAMPAIGN,
      sentAt: { not: null },
      reminderSentAt: null,
      unsubscribedAt: null,
      bouncedAt: null,
      complainedAt: null,
      OR: [{ response: null }, { response: { completedAt: null } }],
      ...(only ? { subscriber: { email: only.toLowerCase() } } : {}),
    },
    include: { subscriber: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const numBatches = Math.ceil(pending.length / batchSize);
  // Spread the batches across the window. Sleep between batches (not after
  // the last), so total wall-clock ≈ overHours.
  const sleepMs =
    numBatches > 1
      ? Math.round((overHours * 3600_000) / (numBatches - 1))
      : 0;

  console.log(`\nReminder campaign: ${SURVEY_CAMPAIGN}`);
  console.log(`Site URL:          ${siteUrl}`);
  console.log(`Subject:           ${SUBJECT}`);
  console.log(`Mode:              ${send ? "LIVE SEND" : "dry-run (use --send)"}`);
  if (only) console.log(`Only:              ${only}`);
  if (limit) console.log(`Limit:             ${limit}`);
  console.log(`Audience:          ${pending.length} non-completers`);
  console.log(`Batch size:        ${batchSize}`);
  console.log(`Batches:           ${numBatches}`);
  console.log(
    `Pacing:            ~${(sleepMs / 60000).toFixed(1)} min between batches over ~${overHours}h`,
  );

  if (pending.length === 0) {
    console.log("\nNothing to remind. Exiting.");
    return;
  }
  if (!send) {
    console.log("\nDry-run. First 5 recipients:");
    for (const p of pending.slice(0, 5)) console.log(`  ${p.subscriber.email}`);
    console.log("\nRun with --send to actually email.");
    return;
  }

  const resend = new Resend(apiKey!);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += batchSize) {
    const chunk = pending.slice(i, i + batchSize);

    const payload = await Promise.all(
      chunk.map(async (inv) => {
        const surveyUrl = `${siteUrl}/survey/${inv.token}`;
        const unsubscribeUrl = `${siteUrl}/api/survey/unsubscribe?token=${inv.token}`;
        const html = await buildSurveyInviteHtml({
          surveyUrl,
          unsubscribeUrl,
          variant: "reminder",
        });
        const text = buildSurveyInviteText({
          surveyUrl,
          unsubscribeUrl,
          variant: "reminder",
        });
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
            { name: "kind", value: "reminder" },
          ],
        } as unknown as Parameters<typeof resend.batch.send>[0][number] & {
          settings: { tracking: { open: false; click: false } };
        };
      }),
    );
    // Both open and click tracking off — pixel + click-URL rewrite are
    // strong "bulk marketing" signals to Gmail/Yahoo.
    for (const p of payload) {
      (
        p as unknown as {
          settings: { tracking: { open: false; click: false } };
        }
      ).settings = { tracking: { open: false, click: false } };
    }

    try {
      const result = await resend.batch.send(payload);
      if (result.error) {
        console.warn(
          `  Batch ${i / batchSize + 1} error: ${result.error.message}`,
        );
        failed += chunk.length;
      } else {
        // Stamp reminderSentAt so a re-run skips these even if it crashes
        // before the whole window completes.
        await Promise.all(
          chunk.map(async (inv) => {
            try {
              await prisma.surveyInvite.update({
                where: { id: inv.id },
                data: { reminderSentAt: new Date() },
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
      console.warn(
        `  Batch ${i / batchSize + 1} threw: ${(err as Error).message}`,
      );
      failed += chunk.length;
    }

    const done = Math.min(i + batchSize, pending.length);
    console.log(
      `Progress: ${done}/${pending.length} (sent ${sent}, failed ${failed})`,
    );

    if (i + batchSize < pending.length && sleepMs > 0) {
      await sleep(sleepMs);
    }
  }

  console.log(`\nDone. Reminded ${sent}, failed ${failed}.`);
}

main()
  .catch((err) => {
    console.error("Reminder send crashed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await new Promise((r) => setTimeout(r, 250));
  });
