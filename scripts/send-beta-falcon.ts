// Fifth send: the Falcon tier-upgrade thank-you, wave 1 only.
//
// Two things make this different from send-beta-feature.ts, which is
// otherwise its closest sibling.
//
// 1. IT IS WAVE-SCOPED. send-beta-feature targets by campaign alone, which
//    now sweeps in wave 2 as well. This mail thanks the FIRST cohort for
//    feedback and says "you were in the first trench", so mailing wave 2
//    would be simply untrue for them.
//
// 2. IT SENDS IN COHORT ORDER, account-holders first. The copy says "you now
//    hold Falcon". That is true today only for people with a terminal
//    account, because a tier attaches to a user id and 959 of the 1,364 have
//    never signed up. Mailing them in one undifferentiated blast would tell
//    the majority something false. Instead:
//
//      phase 1  people who already hold Falcon      -> true on arrival
//      phase 2  people with no account yet          -> made true by
//                                                      watch-falcon-grants.ts
//
//    Phase 2 therefore has a HARD PRECONDITION: the grant watcher must be
//    running, or every phase-2 recipient is told they hold a tier that will
//    never be applied. The script refuses to start phase 2 unless
//    --i-have-the-watcher-running is passed, which is a deliberate speed
//    bump, not a real check.
//
// Usage:
//   pnpm exec tsx scripts/send-beta-falcon.ts
//   pnpm exec tsx scripts/send-beta-falcon.ts --phase 1 --send
//   pnpm exec tsx scripts/send-beta-falcon.ts --phase 2 --send --i-have-the-watcher-running

import "dotenv/config";

import { Resend } from "resend";

import { getPrismaClient } from "../src/lib/prisma";
import { getTrenchersPool } from "../src/lib/trenchers-db";
import { BETA_CAMPAIGN } from "../src/lib/beta-invite";
import { BETA_FALCON_SUBJECT, buildBetaFalconHtml, buildBetaFalconText } from "../src/lib/email";

const WAVE = "wave-1-completed";

/// Resend accepts at most 100 messages per batch call.
const MAX_BATCH = 100;

/// Phase 1 is the 405 who already hold the tier. The founder asked for the
/// whole cohort inside 30 minutes, which at <=100 per call means five batches
/// about 7.5 minutes apart. A 15-minute gap cannot fit 405 into 30 minutes
/// without 135-per-batch, which Resend refuses.
const PHASE1_WINDOW_MIN = 30;
const PHASE1_BATCH = 85;

/// Phase 2 is the long tail, paced at the requested 15 minutes per batch.
const PHASE2_GAP_MIN = 15;
const PHASE2_BATCH = 80;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseArgs() {
  const args = process.argv.slice(2);
  const read = (flag: string) => {
    const i = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
    if (i < 0) return undefined;
    const a = args[i];
    return a.includes("=") ? a.split("=").slice(1).join("=") : args[i + 1];
  };
  const num = (v: string | undefined) => (v == null ? undefined : Number(v));
  return {
    send: args.includes("--send"),
    trackOpens: args.includes("--track-opens"),
    watcherRunning: args.includes("--i-have-the-watcher-running"),
    phase: num(read("--phase")) ?? 1,
    // Only override the phase default when --batch was actually PASSED.
    // Clamping an absent flag through Math.max(1, ...) yields 1, which is
    // truthy, so a `|| default` fallback never fires and every send silently
    // becomes one message per API call.
    batch: read("--batch") == null
      ? undefined
      : Math.min(MAX_BATCH, Math.max(1, num(read("--batch")) ?? 1)),
    gap: num(read("--gap")),
    limit: num(read("--limit")) ?? Infinity,
  };
}

/// Campaign-wide reputation, not falcon-only. The falcon columns start empty,
/// so a falcon-only gate would read 0/0 and be blind for the whole first
/// phase, which is exactly when a bad list hurts most.
async function reputation() {
  const prisma = getPrismaClient();
  const [sent, bounced, complained] = await Promise.all([
    prisma.betaInvite.count({ where: { campaign: BETA_CAMPAIGN, sentAt: { not: null } } }),
    prisma.betaInvite.count({ where: { campaign: BETA_CAMPAIGN, bouncedAt: { not: null } } }),
    prisma.betaInvite.count({ where: { campaign: BETA_CAMPAIGN, complainedAt: { not: null } } }),
  ]);
  return { sent, bounced, complained };
}

/// Thresholds below the provider's enforcement line so we stop before they do.
/// Needs a floor of real sends first: on a handful of messages one bounce is
/// 1% and would abort a perfectly healthy run.
function gate(s: { sent: number; bounced: number; complained: number }) {
  if (s.sent < 200) return null;
  const b = s.bounced / s.sent;
  const c = s.complained / s.sent;
  if (b > 0.04) return `bounce rate ${(b * 100).toFixed(2)}% over 4%`;
  if (c > 0.001) return `complaint rate ${(c * 100).toFixed(3)}% over 0.1%`;
  return null;
}

async function main() {
  const opts = parseArgs();
  const prisma = getPrismaClient();

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    console.error("RESEND_API_KEY and RESEND_FROM_EMAIL must be set.");
    process.exit(1);
  }
  if (opts.phase !== 1 && opts.phase !== 2) {
    console.error("--phase must be 1 (account holders) or 2 (no account yet).");
    process.exit(1);
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.trenchers.ai").replace(/\/$/, "");
  const accessUrl = process.env.BETA_ACCESS_URL ?? "https://beta.trenchers.ai";
  const replyTo = process.env.RESEND_REPLY_TO ?? "team@trenchers.ai";

  // Same exclusion set as the feature send: anyone who bounced or complained
  // on ANY prior send of this campaign stays excluded, because reputation
  // damage is cumulative across sends and a bad address does not heal.
  const candidates = await prisma.betaInvite.findMany({
    where: {
      campaign: BETA_CAMPAIGN,
      wave: WAVE,
      sentAt: { not: null },
      falconSentAt: null,
      unsubscribedAt: null,
      bouncedAt: null,
      complainedAt: null,
      suppressedAt: null,
      reminderBouncedAt: null,
      reminderComplainedAt: null,
      nudgeBouncedAt: null,
      nudgeComplainedAt: null,
      featureBouncedAt: null,
      featureComplainedAt: null,
    },
    include: { subscriber: { select: { email: true } } },
    orderBy: { sentAt: "asc" },
  });

  const pool = getTrenchersPool();
  if (!pool) {
    console.error("TRENCHERS_DATABASE_URL must be set to split the cohorts.");
    process.exit(1);
  }
  const emails = candidates.map((c) => c.subscriber.email.trim().toLowerCase());
  const accountRows = await pool.query<{ email: string }>(
    `SELECT lower(email) AS email FROM users
      WHERE email IS NOT NULL AND lower(email) = ANY($1::text[])`,
    [emails],
  );
  const hasAccount = new Set(accountRows.rows.map((r) => r.email));

  const phase1 = candidates.filter((c) => hasAccount.has(c.subscriber.email.trim().toLowerCase()));
  const phase2 = candidates.filter((c) => !hasAccount.has(c.subscriber.email.trim().toLowerCase()));

  let pending = opts.phase === 1 ? phase1 : phase2;
  if (Number.isFinite(opts.limit)) pending = pending.slice(0, opts.limit);

  const batch = opts.batch ?? (opts.phase === 1 ? PHASE1_BATCH : PHASE2_BATCH);
  const batches = Math.ceil(pending.length / batch);
  const gapMs =
    opts.gap != null
      ? opts.gap * 60_000
      : opts.phase === 1
        ? batches > 1
          ? Math.floor((PHASE1_WINDOW_MIN * 60_000) / (batches - 1))
          : 0
        : PHASE2_GAP_MIN * 60_000;

  const snap = await reputation();
  console.log(`\nFalcon tier send - ${WAVE} - phase ${opts.phase}`);
  console.log(`Mode:          ${opts.send ? "LIVE SEND" : "dry-run (use --send)"}`);
  console.log(`Subject:       ${BETA_FALCON_SUBJECT}`);
  console.log(`Cohort split:  ${phase1.length} with an account, ${phase2.length} without`);
  console.log(`This phase:    ${pending.length}`);
  console.log(`Batch size:    ${batch}  (${batches} batches)`);
  console.log(`Pace:          ${(gapMs / 60000).toFixed(1)} min between batches, ~${((batches - 1) * gapMs / 3600_000).toFixed(1)}h total`);
  console.log(`Campaign so far: sent ${snap.sent}, bounced ${snap.bounced}, complained ${snap.complained}`);

  if (opts.phase === 2) {
    console.log(
      `\nPhase 2 recipients do NOT hold Falcon yet. The copy says they do.\n` +
        `That becomes true only if scripts/watch-falcon-grants.ts is running\n` +
        `and grants them on sign-in.`,
    );
    if (opts.send && !opts.watcherRunning) {
      console.error(
        `\nREFUSING phase 2: pass --i-have-the-watcher-running once the\n` +
          `watcher is up, to confirm you know the promise will be kept.`,
      );
      process.exit(2);
    }
  }

  if (pending.length === 0) {
    console.log("\nNothing pending.");
    await pool.end();
    await prisma.$disconnect();
    return;
  }
  const blocked = gate(snap);
  if (blocked) {
    console.error(`\nABORT: ${blocked}`);
    process.exit(2);
  }

  if (!opts.send) {
    console.log("\nDry-run. First 5:");
    for (const p of pending.slice(0, 5)) console.log(`  ${p.subscriber.email}`);
    console.log("\nRe-run with --send.");
    await pool.end();
    await prisma.$disconnect();
    return;
  }

  const resend = new Resend(apiKey);
  let sentCount = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += batch) {
    const n = Math.floor(i / batch) + 1;
    const chunk = pending.slice(i, i + batch);
    const started = Date.now();

    // Re-read every batch so a spike stops the remainder.
    const live = await reputation();
    const stop = gate(live);
    if (stop) {
      console.error(`\nABORT mid-run at batch ${n}: ${stop}`);
      process.exit(2);
    }

    const payload = await Promise.all(
      chunk.map(async (row) => {
        const unsubscribeUrl = `${siteUrl}/api/survey/unsubscribe?token=${row.token}&c=beta`;
        const copy = { accessUrl, unsubscribeUrl, recipientEmail: row.subscriber.email };
        return {
          from: fromEmail,
          to: row.subscriber.email,
          subject: BETA_FALCON_SUBJECT,
          html: await buildBetaFalconHtml(copy),
          text: buildBetaFalconText(copy),
          replyTo,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "campaign", value: BETA_CAMPAIGN },
            { name: "inviteId", value: row.id },
            { name: "kind", value: "falcon" },
          ],
          settings: { tracking: { open: opts.trackOpens, click: false } },
        };
      }),
    );

    try {
      let result = await resend.batch.send(
        payload as unknown as Parameters<typeof resend.batch.send>[0],
      );
      for (let a = 1; a < 3 && result.error; a++) {
        console.warn(`  batch ${n}: error (attempt ${a}) - ${result.error.message}`);
        await sleep(2000 * a);
        result = await resend.batch.send(
          payload as unknown as Parameters<typeof resend.batch.send>[0],
        );
      }
      if (result.error) {
        console.warn(`  batch ${n}: failed after retries, ${chunk.length} left pending`);
        failed += chunk.length;
      } else {
        const ids = result.data?.data ?? [];
        // One stamping query per batch, not N. Parallel per-row writes are
        // what exhausted the Supabase pooler and killed an earlier send.
        // Retried hard, because the mail is already delivered: an unstamped
        // row looks pending and gets mailed a SECOND time on the next run.
        const rowIds = chunk.map((r) => r.id);
        const msgIds = chunk.map((_, k) => ids[k]?.id ?? null);
        let stamped = false;
        for (let attempt = 1; attempt <= 4 && !stamped; attempt++) {
          try {
            await prisma.$executeRaw`
              UPDATE "BetaInvite" AS b
                 SET "falconSentAt" = now(),
                     "falconResendMsgId" = v.msg
                FROM (
                  SELECT unnest(${rowIds}::text[]) AS id,
                         unnest(${msgIds}::text[]) AS msg
                ) AS v
               WHERE b.id = v.id`;
            stamped = true;
            sentCount += chunk.length;
          } catch (err) {
            if (attempt === 4) {
              failed += chunk.length;
              console.warn(`  batch ${n}: SENT but could not stamp - ${(err as Error).message}`);
              console.warn(`  batch ${n}: those ${chunk.length} may be re-sent on a later run`);
            } else {
              await sleep(1500 * attempt);
            }
          }
        }
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
  console.log(`\nPhase ${opts.phase} complete. Sent ${sentCount}, failed ${failed}.`);
  console.log(`  campaign totals: sent ${final.sent}, bounced ${final.bounced}, complained ${final.complained}`);
  await pool.end();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Falcon send crashed:", e);
  process.exit(1);
});
