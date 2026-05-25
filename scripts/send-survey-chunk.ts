// Unified chunk sender for cron-driven, paced delivery. Each invocation
// sends the next `--limit` people drawn from BOTH pending pools and stamps
// them, so a cron firing every ~16 min walks the whole audience over ~10h:
//
//   - INVITES  : verified signups never sent (sentAt = null)        -> "invite" copy
//   - REMINDERS: already sent, not completed, still reachable        -> "reminder" copy
//
// The 73 invites are folded INTO the drip (not front-loaded): each tick takes
// invites in proportion to their share of what's left, so they spread evenly
// across the whole run. Idempotent + resumable via sentAt / reminderSentAt —
// re-running (or the next cron tick) just continues with whoever is left.
//
// Usage:
//   pnpm exec tsx scripts/send-survey-chunk.ts                  # dry-run
//   pnpm exec tsx scripts/send-survey-chunk.ts --send --limit 50
//   (cron) */16 * * * * <repo>/scripts/cron-send.sh
//
// Required env: DATABASE_URL, RESEND_API_KEY, RESEND_FROM_EMAIL,
//   NEXT_PUBLIC_SITE_URL, optional RESEND_REPLY_TO.

import "dotenv/config";
import { randomBytes } from "node:crypto";

import { Resend } from "resend";

import {
  buildSurveyInviteHtml,
  buildSurveyInviteText,
  type SurveyVariant,
} from "../src/lib/email";
import { getPrismaClient } from "../src/lib/prisma";
import { SURVEY_CAMPAIGN } from "../src/lib/survey";

const INVITE_SUBJECT = "You're being considered for priority access";
const REMINDER_SUBJECT = "You're still being considered for priority access";
const DEFAULT_LIMIT = 50;

function parseArgs() {
  const args = process.argv.slice(2);
  const send = args.includes("--send");
  const limitArg = args.find((a) => a.startsWith("--limit"));
  const limit = limitArg
    ? Number(
        limitArg.includes("=")
          ? limitArg.split("=")[1]
          : args[args.indexOf(limitArg) + 1],
      ) || DEFAULT_LIMIT
    : DEFAULT_LIMIT;
  return { send, limit: Math.max(1, limit) };
}

function generateToken() {
  return randomBytes(24).toString("base64url");
}

type Target = { id: string; email: string; token: string; variant: SurveyVariant };

async function main() {
  const { send, limit } = parseArgs();
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

  // Fold in any brand-new verified signups: ensure each has an invite row.
  // Only on a real send, so a dry-run stays read-only.
  if (send) {
    const needInvite = await prisma.waitlistSubscriber.findMany({
      where: { isVerified: true, surveyInvite: null },
      select: { id: true },
    });
    for (const s of needInvite) {
      try {
        await prisma.surveyInvite.create({
          data: {
            campaign: SURVEY_CAMPAIGN,
            subscriberId: s.id,
            token: generateToken(),
          },
        });
      } catch {
        // unique race / already created — ignore.
      }
    }
  }

  // Pending pools (oldest first).
  const invites = await prisma.surveyInvite.findMany({
    where: { campaign: SURVEY_CAMPAIGN, sentAt: null, unsubscribedAt: null },
    include: { subscriber: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
  });
  const reminders = await prisma.surveyInvite.findMany({
    where: {
      campaign: SURVEY_CAMPAIGN,
      sentAt: { not: null },
      reminderSentAt: null,
      unsubscribedAt: null,
      bouncedAt: null,
      complainedAt: null,
      OR: [{ response: null }, { response: { completedAt: null } }],
    },
    include: { subscriber: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const totalRemaining = invites.length + reminders.length;
  console.log(`\nSurvey chunk sender — ${SURVEY_CAMPAIGN} — ${new Date().toISOString()}`);
  console.log(`Mode:              ${send ? "LIVE SEND" : "dry-run (use --send)"}`);
  console.log(`Pending invites:   ${invites.length}`);
  console.log(`Pending reminders: ${reminders.length}`);
  console.log(`Total remaining:   ${totalRemaining}`);
  console.log(`Chunk limit:       ${limit}`);

  if (totalRemaining === 0) {
    console.log("\nNothing to send. Exiting.");
    return;
  }

  // Proportional split so invites spread across the whole run. Top up from
  // whichever pool has slack if the other runs short of its share.
  let inviteTake = Math.min(
    invites.length,
    Math.round((limit * invites.length) / totalRemaining),
  );
  let reminderTake = Math.min(reminders.length, limit - inviteTake);
  inviteTake = Math.min(invites.length, limit - reminderTake);

  const chunk: Target[] = [
    ...invites.slice(0, inviteTake).map((i) => ({
      id: i.id,
      email: i.subscriber.email,
      token: i.token,
      variant: "invite" as const,
    })),
    ...reminders.slice(0, reminderTake).map((i) => ({
      id: i.id,
      email: i.subscriber.email,
      token: i.token,
      variant: "reminder" as const,
    })),
  ];

  console.log(
    `This chunk:        ${chunk.length} (${inviteTake} invite, ${reminderTake} reminder)`,
  );

  if (!send) {
    console.log("\nDry-run. First 6 in chunk:");
    for (const t of chunk.slice(0, 6)) console.log(`  [${t.variant}] ${t.email}`);
    console.log("\nRun with --send to actually email.");
    return;
  }

  const resend = new Resend(apiKey!);

  const payload = await Promise.all(
    chunk.map(async (t) => {
      const surveyUrl = `${siteUrl}/survey/${t.token}`;
      const unsubscribeUrl = `${siteUrl}/api/survey/unsubscribe?token=${t.token}`;
      const html = await buildSurveyInviteHtml({
        surveyUrl,
        unsubscribeUrl,
        variant: t.variant,
      });
      const text = buildSurveyInviteText({
        surveyUrl,
        unsubscribeUrl,
        variant: t.variant,
      });
      return {
        from: fromEmail!,
        to: t.email,
        subject: t.variant === "invite" ? INVITE_SUBJECT : REMINDER_SUBJECT,
        html,
        text,
        replyTo,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: [
          { name: "campaign", value: SURVEY_CAMPAIGN },
          { name: "inviteId", value: t.id },
          { name: "kind", value: t.variant },
        ],
      } as unknown as Parameters<typeof resend.batch.send>[0][number] & {
        settings: { tracking: { open: false; click: false } };
      };
    }),
  );
  for (const p of payload) {
    (
      p as unknown as { settings: { tracking: { open: false; click: false } } }
    ).settings = { tracking: { open: false, click: false } };
  }

  let sent = 0;
  let failed = 0;
  try {
    const result = await resend.batch.send(payload);
    if (result.error) {
      console.warn(`Batch error: ${result.error.message}`);
      failed += chunk.length;
    } else {
      const ids = result.data?.data ?? [];
      await Promise.all(
        chunk.map(async (t, idx) => {
          const msgId = ids[idx]?.id ?? null;
          try {
            await prisma.surveyInvite.update({
              where: { id: t.id },
              data:
                t.variant === "invite"
                  ? { sentAt: new Date(), resendMsgId: msgId ?? undefined }
                  : { reminderSentAt: new Date() },
            });
            sent++;
          } catch (err) {
            console.warn(
              `  ${t.email}: db update failed — ${(err as Error).message}`,
            );
            failed++;
          }
        }),
      );
    }
  } catch (err) {
    console.warn(`Batch threw: ${(err as Error).message}`);
    failed += chunk.length;
  }

  console.log(
    `\nDone this tick. Sent ${sent}, failed ${failed}. Remaining after: ~${Math.max(0, totalRemaining - sent)}.`,
  );
}

main()
  .catch((err) => {
    console.error("Chunk send crashed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await new Promise((r) => setTimeout(r, 250));
  });
