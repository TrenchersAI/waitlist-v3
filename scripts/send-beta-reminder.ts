// Second send for the beta campaign: the signup-issue reminder.
//
// Audience is computed live, not from a stored flag: invitees who were
// mailed the invite, are still reachable, and do NOT appear in the
// terminal's users table. Computing it at send time means anyone who signs
// in between now and their batch is dropped automatically, so we never tell
// someone who is already using the product that their account is waiting.
//
// Resumable and idempotent via `reminderSentAt`. Suppression is absolute:
// anyone who unsubscribed, bounced, or complained on the first send is
// never mailed again, regardless of sign-in status.
//
//   pnpm exec tsx scripts/send-beta-reminder.ts
//   pnpm exec tsx scripts/send-beta-reminder.ts --send --hours 1
//   ./scripts/send-detached.sh  (see runbook for the detached variant)

import "dotenv/config";

import { Resend } from "resend";

import {
  BETA_REMINDER_SUBJECT,
  buildBetaReminderHtml,
  buildBetaReminderText,
} from "../src/lib/email";
import { BETA_CAMPAIGN } from "../src/lib/beta-invite";
import { getPrismaClient } from "../src/lib/prisma";
import { getTrenchersPool } from "../src/lib/trenchers-db";

const RESEND_BOUNCE_LIMIT = 0.04;
const RESEND_COMPLAINT_LIMIT = 0.0008;
const BOUNCE_PAUSE_AT = 0.02;
const COMPLAINT_PAUSE_AT = 0.0004;
const MIN_SAMPLE_FOR_RATE_GATE = 400;

const DEFAULT_BATCH = 40;
const MAX_BATCH = 100;
const DEFAULT_HOURS = 1;

function parseArgs() {
  const args = process.argv.slice(2);
  const read = (flag: string) => {
    const i = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
    if (i === -1) return undefined;
    const a = args[i];
    return a.includes("=") ? a.split("=").slice(1).join("=") : args[i + 1];
  };
  const num = (v: string | undefined) => (v ? Number(v) : undefined);
  return {
    send: args.includes("--send"),
    trackOpens: args.includes("--track-opens"),
    batch: Math.min(MAX_BATCH, Math.max(1, num(read("--batch")) ?? DEFAULT_BATCH)),
    limit: num(read("--limit")) ?? Infinity,
    hours: num(read("--hours")) ?? DEFAULT_HOURS,
  };
}

/// Open tracking is OFF by default and must be opted into per run with
/// --track-opens.
///
/// The 1x1 pixel is a recognisable bulk-marketing signal, and the resulting
/// number is not trustworthy anyway: Apple Mail Privacy Protection prefetches
/// images for a large share of recipients, which inflates opens without a
/// human having read anything. We measure sign-ins instead, which is a real
/// action rather than a proxy for one.
///
/// It exists as a flag because an open rate, even a noisy one, is the only
/// way to tell "delivered but never seen" apart from "seen and ignored", and
/// that distinction matters when a wave underperforms.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/// Reputation across the reminder send specifically. The first send's
/// numbers are healthy and settled; mixing them in would mask a problem
/// that only this message is causing.
async function reputation() {
  const prisma = getPrismaClient();
  const [sent, bounced, complained] = await Promise.all([
    prisma.betaInvite.count({
      where: { campaign: BETA_CAMPAIGN, reminderSentAt: { not: null } },
    }),
    prisma.betaInvite.count({
      where: { campaign: BETA_CAMPAIGN, reminderBouncedAt: { not: null } },
    }),
    prisma.betaInvite.count({
      where: { campaign: BETA_CAMPAIGN, reminderComplainedAt: { not: null } },
    }),
  ]);
  return {
    sent,
    bounced,
    complained,
    bounceRate: sent > 0 ? bounced / sent : 0,
    complaintRate: sent > 0 ? complained / sent : 0,
  };
}

function gate(s: Awaited<ReturnType<typeof reputation>>): string | null {
  if (s.sent < MIN_SAMPLE_FOR_RATE_GATE) return null;
  if (s.bounceRate >= BOUNCE_PAUSE_AT) {
    return `bounce rate ${(s.bounceRate * 100).toFixed(2)}% at or above the ${(
      BOUNCE_PAUSE_AT * 100
    ).toFixed(2)}% pause threshold (Resend suspends at ${(RESEND_BOUNCE_LIMIT * 100).toFixed(0)}%)`;
  }
  if (s.complaintRate >= COMPLAINT_PAUSE_AT) {
    return `complaint rate ${(s.complaintRate * 100).toFixed(3)}% at or above the ${(
      COMPLAINT_PAUSE_AT * 100
    ).toFixed(3)}% pause threshold (Resend suspends at ${(RESEND_COMPLAINT_LIMIT * 100).toFixed(2)}%)`;
  }
  return null;
}

async function main() {
  const { send, trackOpens, batch, limit, hours } = parseArgs();
  const prisma = getPrismaClient();

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (send && (!apiKey || !fromEmail)) {
    console.error("RESEND_API_KEY and RESEND_FROM_EMAIL must be set.");
    process.exit(1);
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.trenchers.ai").replace(/\/$/, "");
  const accessUrl = process.env.BETA_ACCESS_URL ?? "https://beta.trenchers.ai";
  const replyTo = process.env.RESEND_REPLY_TO ?? "team@trenchers.ai";

  // Everyone mailed the invite who is still reachable and not yet reminded.
  const candidates = await prisma.betaInvite.findMany({
    where: {
      campaign: BETA_CAMPAIGN,
      sentAt: { not: null },
      reminderSentAt: null,
      unsubscribedAt: null,
      bouncedAt: null,
      complainedAt: null,
    },
    include: { subscriber: { select: { email: true } } },
    orderBy: { sentAt: "asc" },
  });

  // Drop anyone who has signed in. This is the whole point of the message,
  // so it is read live from the terminal rather than from our own column.
  const pool = getTrenchersPool();
  if (!pool) {
    console.error("TRENCHERS_DATABASE_URL must be set to identify who signed in.");
    process.exit(1);
  }
  const emails = candidates.map((c) => c.subscriber.email.trim().toLowerCase());
  const res = await pool.query<{ email: string }>(
    `SELECT lower(email) AS email FROM users
      WHERE email IS NOT NULL AND lower(email) = ANY($1::text[])`,
    [emails],
  );
  const signedIn = new Set(res.rows.map((r) => r.email));

  let pending = candidates.filter(
    (c) => !signedIn.has(c.subscriber.email.trim().toLowerCase()),
  );
  if (Number.isFinite(limit)) pending = pending.slice(0, limit);

  const batches = Math.ceil(pending.length / batch);
  const ratePerHour = pending.length / hours;
  const gapMs = ratePerHour > 0 ? Math.round((3600_000 * batch) / ratePerHour) : 0;

  const snap = await reputation();
  console.log(`\nBeta signup-issue reminder - ${new Date().toISOString()}`);
  console.log(`Open tracking: ${trackOpens ? "ON" : "off"}`);
  console.log(`Mode:          ${send ? "LIVE SEND" : "dry-run (use --send)"}`);
  console.log(`Invited+reachable: ${candidates.length}`);
  console.log(`  already signed in (skipped): ${signedIn.size}`);
  console.log(`Pending:       ${pending.length}`);
  console.log(`Batch size:    ${batch}  (${batches} batches)`);
  console.log(`Pace:          ~${Math.round(ratePerHour)}/hour, ${(gapMs / 60000).toFixed(1)} min between batches`);
  console.log(`Est. duration: ~${((batches * gapMs) / 3600_000).toFixed(1)} hours`);
  console.log(`Reminder sent so far: ${snap.sent} (bounced ${snap.bounced}, complained ${snap.complained})`);

  if (pending.length === 0) {
    console.log("\nNothing pending. Exiting.");
    await pool.end();
    return;
  }

  const blocked = gate(snap);
  if (blocked) {
    console.error(`\nABORT before starting: ${blocked}`);
    process.exit(2);
  }

  if (send) {
    const events = await prisma.emailEvent.count();
    if (events === 0) {
      console.error("\nABORT: no webhook events recorded, gating cannot work.");
      process.exit(3);
    }
  }

  if (!send) {
    console.log("\nDry-run. First 5 pending:");
    for (const p of pending.slice(0, 5)) console.log(`  ${p.subscriber.email}`);
    console.log("\nRe-run with --send to go live.");
    await pool.end();
    return;
  }

  const resend = new Resend(apiKey!);
  let sentCount = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += batch) {
    const n = Math.floor(i / batch) + 1;
    const chunk = pending.slice(i, i + batch);
    const started = Date.now();

    const live = await reputation();
    const stop = gate(live);
    if (stop) {
      console.error(`\nABORT mid-run at batch ${n}: ${stop}`);
      console.error(`Sent ${sentCount} before stopping.`);
      process.exit(2);
    }

    const payload = await Promise.all(
      chunk.map(async (row) => {
        const unsubscribeUrl = `${siteUrl}/api/survey/unsubscribe?token=${row.token}&c=beta`;
        const copy = {
          accessUrl,
          unsubscribeUrl,
          recipientEmail: row.subscriber.email,
        };
        return {
          from: fromEmail!,
          to: row.subscriber.email,
          subject: BETA_REMINDER_SUBJECT,
          html: await buildBetaReminderHtml(copy),
          text: buildBetaReminderText(copy),
          replyTo,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "campaign", value: BETA_CAMPAIGN },
            { name: "inviteId", value: row.id },
            { name: "kind", value: "reminder" },
          ],
          settings: { tracking: { open: trackOpens, click: false } },
        };
      }),
    );

    try {
      let result = await resend.batch.send(
        payload as unknown as Parameters<typeof resend.batch.send>[0],
      );
      for (let attempt = 1; attempt < 3 && result.error; attempt++) {
        console.warn(`  batch ${n}: send error (attempt ${attempt}) - ${result.error.message}`);
        await sleep(2000 * attempt);
        result = await resend.batch.send(
          payload as unknown as Parameters<typeof resend.batch.send>[0],
        );
      }
      if (result.error) {
        // Leave pending for a later run rather than marking anyone failed:
        // a provider-side error says nothing about the recipient.
        console.warn(`  batch ${n}: failed after retries, ${chunk.length} left pending`);
        failed += chunk.length;
      } else {
        const ids = result.data?.data ?? [];
        await Promise.all(
          chunk.map(async (row, idx) => {
            try {
              await prisma.betaInvite.update({
                where: { id: row.id },
                data: {
                  reminderSentAt: new Date(),
                  reminderResendMsgId: ids[idx]?.id ?? undefined,
                },
              });
              sentCount++;
            } catch (err) {
              failed++;
              console.warn(`    ${row.subscriber.email}: db update failed - ${(err as Error).message}`);
            }
          }),
        );
      }
    } catch (err) {
      failed += chunk.length;
      console.warn(`  batch ${n}: threw - ${(err as Error).message}`);
    }

    console.log(`  batch ${n}/${batches}: sent ${sentCount}, failed ${failed}`);

    if (i + batch < pending.length) {
      const wait = Math.max(0, gapMs - (Date.now() - started));
      if (wait > 0) await sleep(wait);
    }
  }

  const final = await reputation();
  console.log(`\nReminder run complete. Sent ${sentCount}, failed ${failed}.`);
  console.log(
    `  reminder totals: sent ${final.sent}, bounced ${final.bounced} (${(final.bounceRate * 100).toFixed(2)}%), complained ${final.complained} (${(final.complaintRate * 100).toFixed(3)}%)`,
  );
  await pool.end();
}

main()
  .catch((err) => {
    console.error("Reminder send crashed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await sleep(250);
  });
