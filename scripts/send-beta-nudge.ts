// Third send: the activation nudge, to people who have already signed in.
//
// Audience is computed live from the terminal's users table, not from a
// stored flag, so it always reflects who is actually inside the product at
// send time. Suppression stays absolute across all three sends: anyone who
// bounced, complained, or unsubscribed on any earlier message is excluded
// regardless of how active they are.
//
//   pnpm exec tsx scripts/send-beta-nudge.ts
//   pnpm exec tsx scripts/send-beta-nudge.ts --send --minutes 15

import "dotenv/config";

import { Resend } from "resend";

import {
  BETA_NUDGE_SUBJECT,
  buildBetaNudgeHtml,
  buildBetaNudgeText,
} from "../src/lib/email";
import { BETA_CAMPAIGN } from "../src/lib/beta-invite";
import { getPrismaClient } from "../src/lib/prisma";
import { getTrenchersPool } from "../src/lib/trenchers-db";

const BOUNCE_PAUSE_AT = 0.02;
const COMPLAINT_PAUSE_AT = 0.0004;
const MIN_SAMPLE_FOR_RATE_GATE = 200;
const DEFAULT_BATCH = 40;
const DEFAULT_MINUTES = 15;

function parseArgs() {
  const args = process.argv.slice(2);
  const read = (f: string) => {
    const i = args.findIndex((a) => a === f || a.startsWith(`${f}=`));
    if (i === -1) return undefined;
    const a = args[i];
    return a.includes("=") ? a.split("=").slice(1).join("=") : args[i + 1];
  };
  const num = (v: string | undefined) => (v ? Number(v) : undefined);
  return {
    send: args.includes("--send"),
    trackOpens: args.includes("--track-opens"),
    batch: Math.min(100, Math.max(1, num(read("--batch")) ?? DEFAULT_BATCH)),
    minutes: num(read("--minutes")) ?? DEFAULT_MINUTES,
    limit: num(read("--limit")) ?? Infinity,
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

async function reputation() {
  const p = getPrismaClient();
  const [sent, bounced, complained] = await Promise.all([
    p.betaInvite.count({ where: { campaign: BETA_CAMPAIGN, nudgeSentAt: { not: null } } }),
    p.betaInvite.count({ where: { campaign: BETA_CAMPAIGN, nudgeBouncedAt: { not: null } } }),
    p.betaInvite.count({ where: { campaign: BETA_CAMPAIGN, nudgeComplainedAt: { not: null } } }),
  ]);
  return {
    sent, bounced, complained,
    bounceRate: sent > 0 ? bounced / sent : 0,
    complaintRate: sent > 0 ? complained / sent : 0,
  };
}

function gate(s: Awaited<ReturnType<typeof reputation>>): string | null {
  if (s.sent < MIN_SAMPLE_FOR_RATE_GATE) return null;
  if (s.bounceRate >= BOUNCE_PAUSE_AT)
    return `bounce rate ${(s.bounceRate * 100).toFixed(2)}% at or above ${(BOUNCE_PAUSE_AT * 100).toFixed(2)}%`;
  if (s.complaintRate >= COMPLAINT_PAUSE_AT)
    return `complaint rate ${(s.complaintRate * 100).toFixed(3)}% at or above ${(COMPLAINT_PAUSE_AT * 100).toFixed(3)}%`;
  return null;
}

async function main() {
  const { send, trackOpens, batch, minutes, limit } = parseArgs();
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

  const candidates = await prisma.betaInvite.findMany({
    where: {
      campaign: BETA_CAMPAIGN,
      sentAt: { not: null },
      nudgeSentAt: null,
      unsubscribedAt: null,
      bouncedAt: null,
      complainedAt: null,
      reminderBouncedAt: null,
      reminderComplainedAt: null,
    },
    include: { subscriber: { select: { email: true } } },
    orderBy: { sentAt: "asc" },
  });

  const pool = getTrenchersPool();
  if (!pool) {
    console.error("TRENCHERS_DATABASE_URL must be set to identify signed-in users.");
    process.exit(1);
  }
  const emails = candidates.map((c) => c.subscriber.email.trim().toLowerCase());
  const res = await pool.query<{ email: string }>(
    `SELECT lower(email) AS email FROM users
      WHERE email IS NOT NULL AND lower(email) = ANY($1::text[])`,
    [emails],
  );
  const signedIn = new Set(res.rows.map((r) => r.email));

  // Only people who ARE signed in. This is the inverse of the reminder.
  let pending = candidates.filter((c) => signedIn.has(c.subscriber.email.trim().toLowerCase()));
  if (Number.isFinite(limit)) pending = pending.slice(0, limit);

  const batches = Math.ceil(pending.length / batch);
  const gapMs = batches > 1 ? Math.floor((minutes * 60_000) / (batches - 1)) : 0;

  const snap = await reputation();
  console.log(`\nBeta activation nudge - ${new Date().toISOString()}`);
  console.log(`Open tracking: ${trackOpens ? "ON" : "off"}`);
  console.log(`Mode:        ${send ? "LIVE SEND" : "dry-run (use --send)"}`);
  console.log(`Reachable invitees: ${candidates.length}`);
  console.log(`SIGNED IN (audience): ${pending.length}`);
  console.log(`Batch size:  ${batch}  (${batches} batches)`);
  console.log(`Window:      ${minutes} min, ${(gapMs / 60000).toFixed(1)} min between batches`);
  console.log(`Nudge sent so far: ${snap.sent}`);

  if (pending.length === 0) { console.log("\nNothing pending."); await pool.end(); return; }
  const blocked = gate(snap);
  if (blocked) { console.error(`\nABORT: ${blocked}`); process.exit(2); }

  if (!send) {
    console.log("\nDry-run. First 5:");
    for (const p of pending.slice(0, 5)) console.log(`  ${p.subscriber.email}`);
    console.log("\nRe-run with --send.");
    await pool.end();
    return;
  }

  const resend = new Resend(apiKey!);
  let sentCount = 0, failed = 0;

  for (let i = 0; i < pending.length; i += batch) {
    const n = Math.floor(i / batch) + 1;
    const chunk = pending.slice(i, i + batch);
    const started = Date.now();

    const live = await reputation();
    const stop = gate(live);
    if (stop) { console.error(`\nABORT mid-run at batch ${n}: ${stop}`); process.exit(2); }

    const payload = await Promise.all(chunk.map(async (row) => {
      const unsubscribeUrl = `${siteUrl}/api/survey/unsubscribe?token=${row.token}&c=beta`;
      const copy = { accessUrl, unsubscribeUrl, recipientEmail: row.subscriber.email };
      return {
        from: fromEmail!, to: row.subscriber.email, subject: BETA_NUDGE_SUBJECT,
        html: await buildBetaNudgeHtml(copy), text: buildBetaNudgeText(copy), replyTo,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: [
          { name: "campaign", value: BETA_CAMPAIGN },
          { name: "inviteId", value: row.id },
          { name: "kind", value: "nudge" },
        ],
        settings: { tracking: { open: trackOpens, click: false } },
      };
    }));

    try {
      let result = await resend.batch.send(payload as unknown as Parameters<typeof resend.batch.send>[0]);
      for (let a = 1; a < 3 && result.error; a++) {
        console.warn(`  batch ${n}: error (attempt ${a}) - ${result.error.message}`);
        await sleep(2000 * a);
        result = await resend.batch.send(payload as unknown as Parameters<typeof resend.batch.send>[0]);
      }
      if (result.error) {
        console.warn(`  batch ${n}: failed after retries, ${chunk.length} left pending`);
        failed += chunk.length;
      } else {
        const ids = result.data?.data ?? [];
        await Promise.all(chunk.map(async (row, idx) => {
          try {
            await prisma.betaInvite.update({
              where: { id: row.id },
              data: { nudgeSentAt: new Date(), nudgeResendMsgId: ids[idx]?.id ?? undefined },
            });
            sentCount++;
          } catch (err) {
            failed++;
            console.warn(`    ${row.subscriber.email}: db update failed - ${(err as Error).message}`);
          }
        }));
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
  console.log(`\nNudge run complete. Sent ${sentCount}, failed ${failed}.`);
  console.log(`  nudge totals: sent ${final.sent}, bounced ${final.bounced}, complained ${final.complained}`);
  await pool.end();
}

main().catch((e) => { console.error("Nudge send crashed:", e); process.exit(1); })
  .finally(async () => { await sleep(250); });
