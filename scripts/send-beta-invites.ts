// Paced, resumable, just-in-time sender for the beta-access invite.
//
// Each batch is small and self-contained:
//
//   1. check live bounce and complaint rates, abort if either has turned
//   2. take the next N pending recipients
//   3. GRANT those N beta access, and no one else
//   4. READ THE WHITELIST BACK to confirm the grant actually landed
//   5. mail only the addresses that verified
//   6. sleep, so the wave spreads across the target window
//
// Access is provisioned per batch rather than per wave on purpose. The email
// asserts "your access is open", so that has to be true at the moment it is
// sent, and an abort must never leave people holding access they were never
// told about.
//
// Pacing exists because a burst is a hazard, not a feature. Resend allows 10
// req/s and 100 emails per batch call, which is a theoretical 1,000 emails a
// second. Spreading a wave over several hours keeps daily volume to any one
// mailbox provider modest and gives bounce webhooks time to land and be
// counted by the next batch's gate.
//
//   pnpm exec tsx scripts/send-beta-invites.ts --wave wave-1-completed
//   pnpm exec tsx scripts/send-beta-invites.ts --wave wave-1-completed --send
//   ... --send --batch 40 --hours 6      (spread the wave over ~6 hours)
//   ... --send --batch 40 --per-hour 250 (or set the hourly rate directly)

import "dotenv/config";

import { Resend } from "resend";

import {
  BETA_INVITE_SUBJECT,
  BETA_INVITE_W2_SUBJECT,
  buildBetaInviteHtml,
  buildBetaInviteText,
  buildBetaInviteW2Html,
  buildBetaInviteW2Text,
} from "../src/lib/email";

/// Which invite copy to send. Wave 1 used `v1`; `w2` is the shorter,
/// rewards-led rewrite. Selected by flag rather than by wave so the record
/// of which copy a cohort actually received stays explicit at the call site
/// instead of being inferred later.
const INVITE_TEMPLATES = {
  v1: {
    subject: BETA_INVITE_SUBJECT,
    html: buildBetaInviteHtml,
    text: buildBetaInviteText,
  },
  w2: {
    subject: BETA_INVITE_W2_SUBJECT,
    html: buildBetaInviteW2Html,
    text: buildBetaInviteW2Text,
  },
} as const;

type InviteTemplate = keyof typeof INVITE_TEMPLATES;
import { BETA_CAMPAIGN, WAVE_ORDER, type InviteWave } from "../src/lib/beta-invite";
import { grantBatch, verifyAccess } from "../src/lib/beta-grant";
import { getPrismaClient } from "../src/lib/prisma";

/// Resend's published ceilings. Crossing either risks the account outright,
/// so we pause at half of each to leave room to investigate.
const RESEND_BOUNCE_LIMIT = 0.04;
const RESEND_COMPLAINT_LIMIT = 0.0008;
const BOUNCE_PAUSE_AT = 0.02;
const COMPLAINT_PAUSE_AT = 0.0004;

/// Rates are meaningless on tiny samples: at n=100 a single complaint reads
/// as 1% and would abort a perfectly healthy send.
const MIN_SAMPLE_FOR_RATE_GATE = 400;

/// Small by default. Resend permits 100 per call, but smaller batches mean
/// finer-grained aborts and a smaller population exposed to any single
/// mistake.
const DEFAULT_BATCH = 40;
const MAX_BATCH = 100;
const DEFAULT_HOURS = 6;

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
    template: ((read("--template") ?? "v1") in INVITE_TEMPLATES
      ? read("--template") ?? "v1"
      : "v1") as InviteTemplate,
    wave: read("--wave") as InviteWave | undefined,
    batch: Math.min(MAX_BATCH, Math.max(1, num(read("--batch")) ?? DEFAULT_BATCH)),
    limit: num(read("--limit")) ?? Infinity,
    hours: num(read("--hours")),
    perHour: num(read("--per-hour")),
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
  const prisma = getPrismaClient();
  const [sent, bounced, complained, unsubscribed] = await Promise.all([
    prisma.betaInvite.count({ where: { campaign: BETA_CAMPAIGN, sentAt: { not: null } } }),
    prisma.betaInvite.count({ where: { campaign: BETA_CAMPAIGN, bouncedAt: { not: null } } }),
    prisma.betaInvite.count({ where: { campaign: BETA_CAMPAIGN, complainedAt: { not: null } } }),
    prisma.betaInvite.count({ where: { campaign: BETA_CAMPAIGN, unsubscribedAt: { not: null } } }),
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
    ).toFixed(3)}% pause threshold (Resend suspends at ${(
      RESEND_COMPLAINT_LIMIT * 100
    ).toFixed(2)}%)`;
  }
  return null;
}

async function main() {
  const { send, trackOpens, template, wave, batch, limit, hours, perHour } = parseArgs();
  const tpl = INVITE_TEMPLATES[template];
  const prisma = getPrismaClient();

  if (!wave || !WAVE_ORDER.includes(wave)) {
    console.error(`--wave is required, one of:\n  ${WAVE_ORDER.join("\n  ")}`);
    process.exit(1);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (send && (!apiKey || !fromEmail)) {
    console.error("RESEND_API_KEY and RESEND_FROM_EMAIL must be set.");
    process.exit(1);
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.trenchers.ai").replace(/\/$/, "");
  const accessUrl = process.env.BETA_ACCESS_URL ?? "https://beta.trenchers.ai";
  const replyTo = process.env.RESEND_REPLY_TO ?? "team@trenchers.ai";

  const pending = await prisma.betaInvite.findMany({
    where: {
      campaign: BETA_CAMPAIGN,
      wave,
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

  const batches = Math.ceil(pending.length / batch);
  // Pacing: an explicit hourly rate wins; otherwise spread the whole wave
  // across the target window.
  const ratePerHour = perHour ?? pending.length / (hours ?? DEFAULT_HOURS);
  const gapMs = ratePerHour > 0 ? Math.round((3600_000 * batch) / ratePerHour) : 0;
  const etaHours = (batches * gapMs) / 3600_000;

  const snap = await reputation();
  console.log(`\nBeta invite sender - ${BETA_CAMPAIGN} - ${new Date().toISOString()}`);
  console.log(`Template:      ${template}  ("${tpl.subject}")`);
  console.log(`Open tracking: ${trackOpens ? "ON" : "off"}`);
  console.log(`Mode:          ${send ? "LIVE SEND" : "dry-run (use --send)"}`);
  console.log(`Wave:          ${wave}`);
  console.log(`Pending:       ${pending.length}`);
  console.log(`Batch size:    ${batch}  (${batches} batches)`);
  console.log(`Pace:          ~${Math.round(ratePerHour)}/hour, ${(gapMs / 60000).toFixed(1)} min between batches`);
  console.log(`Est. duration: ~${etaHours.toFixed(1)} hours`);
  console.log(`Campaign sent so far: ${snap.sent} (bounced ${snap.bounced}, complained ${snap.complained})`);

  if (pending.length === 0) {
    console.log("\nNothing pending. Exiting.");
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
      console.error(
        "\nABORT: no webhook events have ever been recorded, so bounce and " +
          "complaint gating cannot work. Verify with scripts/verify-webhook.ts.",
      );
      process.exit(3);
    }
  }

  if (!send) {
    console.log("\nDry-run. First 5 pending:");
    for (const p of pending.slice(0, 5)) console.log(`  ${p.subscriber.email}`);
    console.log("\nPer batch: grant access, verify it landed, then mail only the verified.");
    console.log("Re-run with --send to go live.");
    return;
  }

  const resend = new Resend(apiKey!);
  let sentCount = 0;
  let grantFailed = 0;
  let sendFailed = 0;

  for (let i = 0; i < pending.length; i += batch) {
    const n = Math.floor(i / batch) + 1;
    const chunk = pending.slice(i, i + batch);
    const started = Date.now();

    // 1. reputation gate, re-read every batch so a spike stops the rest
    const live = await reputation();
    const stop = gate(live);
    if (stop) {
      console.error(`\nABORT mid-wave at batch ${n}: ${stop}`);
      console.error(`Sent ${sentCount} in this run before stopping.`);
      process.exit(2);
    }

    // 2. grant access to exactly this batch, skipping anyone already
    //    granted by an earlier run or by the standalone grant script. The
    //    verify step below still covers everyone either way, so skipping
    //    only avoids redundant writes and drops the dependency on the ops
    //    API for runs where access was provisioned ahead of time.
    const emails = chunk.map((c) => c.subscriber.email);
    const needGrant = chunk
      .filter((c) => c.accessGrantedAt === null)
      .map((c) => c.subscriber.email);
    let grantedNow = 0;
    if (needGrant.length > 0) {
      const grant = await grantBatch(needGrant, `${BETA_CAMPAIGN} ${wave}`);
      grantedNow = grant.granted.length;
      if (grant.failed.length > 0) {
        grantFailed += grant.failed.length;
        for (const f of grant.failed.slice(0, 3)) {
          console.warn(`  grant failed: ${f.email} - ${f.error}`);
        }
      }
    }

    // 3. read the whitelist back. The email claims access is open, so we
    //    confirm that is true rather than trusting the 2xx.
    const verified = await verifyAccess(emails);
    if (verified === null) {
      console.error(
        "\nABORT: cannot reach the terminal to verify access. Refusing to " +
          "promise access we have not confirmed.",
      );
      process.exit(4);
    }

    const mailable = chunk.filter((c) =>
      verified.has(c.subscriber.email.trim().toLowerCase()),
    );
    const skipped = chunk.length - mailable.length;

    if (mailable.length > 0) {
      await prisma.betaInvite.updateMany({
        where: { id: { in: mailable.map((m) => m.id) } },
        data: { accessGrantedAt: new Date() },
      });

      const payload = await Promise.all(
        mailable.map(async (row) => {
          const unsubscribeUrl = `${siteUrl}/api/survey/unsubscribe?token=${row.token}&c=beta`;
          const copy = {
            accessUrl,
            unsubscribeUrl,
            recipientEmail: row.subscriber.email,
          };
          return {
            from: fromEmail!,
            to: row.subscriber.email,
            subject: tpl.subject,
            html: await tpl.html(copy),
            text: tpl.text(copy),
            replyTo,
            headers: {
              "List-Unsubscribe": `<${unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
            tags: [
              { name: "campaign", value: BETA_CAMPAIGN },
              { name: "inviteId", value: row.id },
              { name: "wave", value: wave },
            ],
            settings: { tracking: { open: trackOpens, click: false } },
          };
        }),
      );

      try {
        // Retry transient send failures before giving up. Resend returns a
        // 500 "Internal server error" occasionally, and treating that as a
        // permanent failure is wrong: it says nothing about the recipient.
        //
        // This is not hypothetical. Batch 10 of this very wave hit one, and
        // the original code stamped all 40 recipients failedAt, which
        // excluded them from every future run. Forty real people would have
        // silently never received their invite because a server hiccuped.
        let result = await resend.batch.send(
          payload as unknown as Parameters<typeof resend.batch.send>[0],
        );
        for (let attempt = 1; attempt < 3 && result.error; attempt++) {
          console.warn(
            `  batch ${n}: send error (attempt ${attempt}) - ${result.error.message}`,
          );
          await sleep(2000 * attempt);
          result = await resend.batch.send(
            payload as unknown as Parameters<typeof resend.batch.send>[0],
          );
        }

        if (result.error) {
          // Still failing after retries. Leave the rows PENDING rather than
          // stamping failedAt, so a later run picks them up. Only a rejection
          // that is actually about the recipient deserves to be terminal, and
          // we cannot tell that apart here, so the safe default is to retry
          // later rather than to drop someone permanently.
          console.warn(
            `  batch ${n}: send failed after retries, leaving ${mailable.length} pending - ${result.error.message}`,
          );
          sendFailed += mailable.length;
        } else {
          const ids = result.data?.data ?? [];
          await Promise.all(
            mailable.map(async (row, idx) => {
              try {
                await prisma.betaInvite.update({
                  where: { id: row.id },
                  data: { sentAt: new Date(), resendMsgId: ids[idx]?.id ?? undefined },
                });
                sentCount++;
              } catch (err) {
                sendFailed++;
                console.warn(`    ${row.subscriber.email}: db update failed - ${(err as Error).message}`);
              }
            }),
          );
        }
      } catch (err) {
        sendFailed += mailable.length;
        console.warn(`  batch ${n}: threw - ${(err as Error).message}`);
      }
    }

    console.log(
      `  batch ${n}/${batches}: granted ${grantedNow}, verified ${mailable.length}` +
        `${skipped > 0 ? `, skipped ${skipped} unverified` : ""}` +
        ` | running total sent ${sentCount}`,
    );

    if (i + batch < pending.length) {
      // Subtract the work already done so pacing measures wall clock, not
      // sleep, and a slow batch does not stretch the whole schedule.
      const elapsed = Date.now() - started;
      const wait = Math.max(0, gapMs - elapsed);
      if (wait > 0) await sleep(wait);
    }
  }

  const final = await reputation();
  console.log(`\nWave ${wave} run complete.`);
  console.log(`  sent ${sentCount}, grant failures ${grantFailed}, send failures ${sendFailed}`);
  console.log(
    `  campaign totals: sent ${final.sent}, bounced ${final.bounced} (${(
      final.bounceRate * 100
    ).toFixed(2)}%), complained ${final.complained} (${(final.complaintRate * 100).toFixed(3)}%)`,
  );
  console.log("\nLet the webhooks settle before starting the next wave.");
}

main()
  .catch((err) => {
    console.error("Send crashed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await sleep(250);
  });
