// Wave 2: traders already using the product, below the Founding Falcon bar.
//
// SAME MACHINERY AS THE FOUNDING FALCON SEND, deliberately. The audience is
// again defined by trading volume rather than by the waitlist, so it again
// needs `CampaignSend` rows with their own unsubscribe tokens; and every
// failure the earlier campaigns paid for -- the 5s transaction limit, the
// batch-wide rejection from one bad address, the missing idempotency key, two
// concurrent senders -- is guarded here rather than rediscovered.
//
// THE GOAL IS A REPLY. These people signed up and stopped, and we do not know
// why. The mail asks rather than guesses, and invites a direct answer.
//
// SMALL AND HAND-CHECKED. 108 recipients is two batches, so there is no pacing
// window: a volume spike is not a risk at this size, and the operator is
// watching. Everything else the claim sender learned the hard way is kept,
// because none of it was about size:
//
//   * an idempotency key per batch, so a lost response cannot double-send
//   * one stamping statement, never N updates in a transaction
//   * a start lock, so two runs cannot overlap
//   * address validation, so one bad address cannot fail the batch
//   * a working unsubscribe for every recipient, carried on CampaignSend
//     because 37 of them have no waitlist row to hang a token on
//
// Usage:
//   pnpm exec tsx scripts/send-falcon-unclaimed.ts --dry-run
//   pnpm exec tsx scripts/send-falcon-unclaimed.ts --send

import "dotenv/config";
import { closeSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";

import { Resend } from "resend";

import { getPrismaClient } from "../src/lib/prisma";
import { getTrenchersPool } from "../src/lib/trenchers-db";
import { isMailable } from "../src/lib/falcon-claim-audience";
import { FALCON_UNCLAIMED_SUBJECT, buildFalconUnclaimedText } from "../src/lib/email";

const CAMPAIGN = "falcon-unclaimed-2026-09";
/// The Founding Falcon floor. This wave is everyone who traded but sits BELOW
/// it, so the two campaigns cannot overlap: a Founding Falcon must never
/// receive the lesser invitation, and the exclusion is expressed here rather
/// than trusted to the campaign bookkeeping.

/// Smaller than the API cap on purpose. A batch is one API call, so 50 halves
/// the number of messages any single accepted-then-lost response could
/// duplicate, and it makes the send a smoother trickle rather than a pulse
/// every interval.
const BATCH = 50;
/// Spread across this many hours. NOTE the arithmetic: 13,444 over 2 hours is
/// ~6,700/hour, which is FASTER than the 3,550/hour the 14k Falcon campaign
/// ran at, not slower. Batch size is not what mailbox providers judge --
/// volume per hour is. Raising this number is the lever that actually reduces
/// risk; shrinking the batch mostly buys a smoother curve.
const DEFAULT_HOURS = 2;
const LOCK = "/tmp/falcon-unclaimed-send.lock";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/// Enough of an address to recognise a row, not enough to be a mailing list.
function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, local.length - head.length))}@${domain}`;
}

function acquireLock() {
  try {
    const fd = openSync(LOCK, "wx");
    writeSync(fd, String(process.pid));
    closeSync(fd);
  } catch {
    let holder = 0;
    try {
      holder = Number(readFileSync(LOCK, "utf-8").trim());
    } catch {
      /* unreadable lock is treated as stale */
    }
    let alive = false;
    if (holder > 0) {
      try {
        process.kill(holder, 0);
        alive = true;
      } catch {
        alive = false;
      }
    }
    if (alive) {
      console.error(`\nREFUSING TO START: another send is running (pid ${holder}).\n`);
      process.exit(4);
    }
    try {
      unlinkSync(LOCK);
    } catch {
      /* raced; the create below settles it */
    }
    const fd = openSync(LOCK, "wx");
    writeSync(fd, String(process.pid));
    closeSync(fd);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const send = args.includes("--send");
  const hoursIdx = args.indexOf("--hours");
  const hoursRaw = hoursIdx >= 0 ? Number(args[hoursIdx + 1]) : undefined;
  // NaN or a negative here makes every wait NaN, which setTimeout treats as 0
  // -- the whole list would go out as fast as the API allows, which is exactly
  // the spike the pacing exists to prevent. Refused rather than clamped.
  if (hoursRaw !== undefined && (!Number.isFinite(hoursRaw) || hoursRaw <= 0)) {
    console.error(`\n--hours must be a positive number, got ${JSON.stringify(args[hoursIdx + 1])}.\n`);
    process.exit(1);
  }
  const hours = hoursRaw ?? DEFAULT_HOURS;
  // Sends ONE message to an explicit address and touches no campaign state:
  // no rows, no stamping, nobody in the real audience mailed. For eyeballing
  // the copy and checking which tab it lands in before committing to a wave.
  const sampleIdx = args.indexOf("--sample");
  const sampleTo = sampleIdx >= 0 ? args[sampleIdx + 1] : undefined;
  const prisma = getPrismaClient();
  const pool = getTrenchersPool();
  if (!pool) throw new Error("TRENCHERS_DATABASE_URL is not set.");

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    console.error("RESEND_API_KEY and RESEND_FROM_EMAIL must be set.");
    process.exit(1);
  }
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.trenchers.ai").replace(/\/$/, "");
  const replyTo = process.env.RESEND_REPLY_TO ?? "team@trenchers.ai";

  if (sampleTo) {
    const resend = new Resend(apiKey);
    const unsubscribeUrl = `${siteUrl}/api/survey/unsubscribe?token=SAMPLE&c=falcon-unclaimed`;
    const res = await resend.emails.send({
      from: fromEmail,
      to: sampleTo,
      subject: FALCON_UNCLAIMED_SUBJECT,
      text: buildFalconUnclaimedText({ unsubscribeUrl }),
      replyTo,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    } as never);
    console.log(`\nSAMPLE to ${sampleTo}: ${res.error ? `FAILED — ${res.error.message}` : `sent (${res.data?.id})`}\n`);
    return;
  }

  // 1. The cohort, from the terminal's database.
  // An account with NO trading volume at all. `NOT EXISTS` against the
  // aggregate rather than a LEFT JOIN with a zero test: a user with rows that
  // sum to zero has still traded, and belongs in wave 2 rather than here.
  // On the waitlist and holding NO account at all. Everyone with an account
  // was reached by waves 2 and 3; this is the remainder, and it is most of the
  // list.
  const accounts = new Set(
    (
      await pool.query<{ email: string }>(
        `SELECT DISTINCT lower(email) AS email FROM users WHERE email IS NOT NULL`,
      )
    ).rows.map((r) => r.email),
  );
  const wl = await prisma.waitlistSubscriber.findMany({ select: { email: true } });
  const vol = { rows: wl
    .map((r) => ({ email: r.email.toLowerCase() }))
    .filter((r) => !accounts.has(r.email)) };
  const cohort = vol.rows.map((r) => r.email).filter(isMailable);

  // 2. Suppression. An opt-out is GLOBAL and a hard bounce is a fact about the
  //    address, so both count wherever they were recorded -- including on a
  //    waitlist row this person may happen to have.
  const subs = await prisma.waitlistSubscriber.findMany({
    where: { email: { in: cohort } },
    select: {
      email: true,
      unsubscribedAt: true,
      betaInvite: {
        select: { unsubscribedAt: true, bouncedAt: true, complainedAt: true, suppressedAt: true },
      },
      surveyInvite: { select: { unsubscribedAt: true } },
    },
  });
  const blocked = new Set(
    subs
      .filter(
        (s) =>
          s.unsubscribedAt ||
          s.surveyInvite?.unsubscribedAt ||
          s.betaInvite?.unsubscribedAt ||
          s.betaInvite?.bouncedAt ||
          s.betaInvite?.complainedAt ||
          s.betaInvite?.suppressedAt,
      )
      .map((s) => s.email.toLowerCase()),
  );
  // Nobody gets two invitations. Anyone who received ANY earlier campaign is
  // excluded by name, not merely by the audience query -- the segments are
  // meant to be disjoint, and this is the cheap check that proves it.
  const already = await prisma.campaignSend.findMany({ select: { email: true } });
  const falconSet = new Set(already.map((r) => r.email.toLowerCase()));

  const priorOptOut = await prisma.campaignSend.findMany({
    where: { email: { in: cohort }, unsubscribedAt: { not: null } },
    select: { email: true },
  });
  for (const r of priorOptOut) blocked.add(r.email.toLowerCase());

  const audience = cohort.filter((e) => !blocked.has(e) && !falconSet.has(e));

  // 3. One row per recipient, created before anything is sent, so the token
  //    behind their unsubscribe link exists by the time the mail carries it.
  if (send) {
    // ONE statement, and this is the third time the lesson has been paid for.
    // 108 upserts inside `prisma.$transaction` blew Prisma's 5s interactive
    // limit at 5,205ms against the pooler -- the identical failure that killed
    // the token backfill and then a delivered batch of the claim campaign.
    // Anything per-row over this pooler has to be one statement.
    //
    // Tokens are generated IN Postgres for the same reason: no round trip per
    // row. `ON CONFLICT DO NOTHING` keeps it idempotent, so a re-run after a
    // failure adds only the missing rows and never rotates a token already
    // sitting in someone's inbox.
    await prisma.$executeRaw`
      INSERT INTO "CampaignSend" (id, campaign, email, token, "createdAt", "updatedAt")
      SELECT gen_random_uuid()::text,
             ${CAMPAIGN},
             e,
             replace(gen_random_uuid()::text, '-', '') ||
             replace(gen_random_uuid()::text, '-', ''),
             now(), now()
        FROM unnest(${audience}::text[]) AS e
      ON CONFLICT (campaign, email) DO NOTHING`;
  }

  const pending = send
    ? await prisma.campaignSend.findMany({
        where: { campaign: CAMPAIGN, sentAt: null, email: { in: audience } },
        select: { id: true, email: true, token: true },
      })
    : audience.map((email) => ({ id: "", email, token: "" }));

  console.log(`\nWave 4, unclaimed Falcon — ${CAMPAIGN}`);
  console.log(`  cohort (waitlist, no account): ${cohort.length}`);
  console.log(`  excluded, already mailed another wave: ${cohort.filter((e) => falconSet.has(e)).length}`);
  console.log(`  suppressed (opted out / unreachable): ${blocked.size}`);
  console.log(`  to send now: ${pending.length}`);
  console.log(`  subject: ${FALCON_UNCLAIMED_SUBJECT}`);
  const plannedBatches = Math.ceil(pending.length / BATCH);
  const gapMs = plannedBatches > 1
    ? Math.floor((hours * 3_600_000) / (plannedBatches - 1))
    : 0;
  console.log(`  pacing: ${plannedBatches} batches of ${BATCH} over ${hours}h (~${Math.round(gapMs / 1000)}s apart, ~${Math.round(pending.length / hours)}/hour)`);
  console.log(`  mode: ${send ? "LIVE" : "DRY RUN — nothing is sent"}\n`);
  if (!send) {
    console.log(`  sample: ${pending.slice(0, 3).map((r) => maskEmail(r.email)).join(", ")}\n`);
    return;
  }
  if (pending.length === 0) return;

  acquireLock();
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.on(sig, () => {
      try {
        unlinkSync(LOCK);
      } catch {
        /* already gone */
      }
      process.exit(130);
    });
  }
  process.on("exit", () => {
    try {
      unlinkSync(LOCK);
    } catch {
      /* already gone */
    }
  });

  const resend = new Resend(apiKey);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH);
    const n = Math.floor(i / BATCH) + 1;
    const batchStarted = Date.now();
    const payload = chunk.map((row) => {
      const unsubscribeUrl = `${siteUrl}/api/survey/unsubscribe?token=${row.token}&c=falcon-unclaimed`;
      return {
        from: fromEmail,
        to: row.email,
        subject: FALCON_UNCLAIMED_SUBJECT,
        // Text only. See buildFalconUnclaimedText for why there is no HTML twin.
        text: buildFalconUnclaimedText({ unsubscribeUrl }),
        replyTo,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: [
          { name: "campaign", value: CAMPAIGN },
          { name: "sendId", value: row.id },
        ],
        settings: { tracking: { open: false, click: false } },
      };
    });

    const key = `${CAMPAIGN}:${chunk[0]?.id ?? n}`;
    try {
      let result = await resend.batch.send(
        payload as unknown as Parameters<typeof resend.batch.send>[0],
        { idempotencyKey: key } as never,
      );
      for (let a = 1; a < 3 && result.error; a++) {
        console.warn(`  batch ${n}: ${result.error.message} (attempt ${a})`);
        await sleep(2000 * a);
        result = await resend.batch.send(
          payload as unknown as Parameters<typeof resend.batch.send>[0],
          { idempotencyKey: key } as never,
        );
      }
      if (result.error) {
        // One bad address fails the whole batch and Resend does not name it, so
        // fall back to one at a time: the offender costs only itself.
        console.warn(`  batch ${n}: rejected, re-sending individually`);
        const okIds: string[] = [];
        const okMsgs: string[] = [];
        for (let k = 0; k < chunk.length; k++) {
          try {
            const one = await resend.emails.send(
              payload[k] as unknown as Parameters<typeof resend.emails.send>[0],
              { idempotencyKey: `${CAMPAIGN}:${chunk[k].id}` } as never,
            );
            if (one.error) {
              console.warn(`      rejected: ${maskEmail(chunk[k].email)} — ${one.error.message}`);
              failed += 1;
              continue;
            }
            okIds.push(chunk[k].id);
            okMsgs.push(one.data?.id ?? "");
          } catch (e) {
            console.warn(`      rejected: ${maskEmail(chunk[k].email)} — ${(e as Error).message}`);
            failed += 1;
          }
        }
        await stamp(okIds, okMsgs);
        sent += okIds.length;
      } else {
        const ids = result.data?.data ?? [];
        await stamp(
          chunk.map((r) => r.id),
          chunk.map((_, k) => ids[k]?.id ?? ""),
        );
        sent += chunk.length;
      }
    } catch (e) {
      failed += chunk.length;
      console.warn(`  batch ${n}: threw — ${(e as Error).message}`);
    }
    console.log(`  batch ${n}/${plannedBatches}: sent ${sent}, failed ${failed}`);
    // Measured from the START of the batch, so the wait absorbs however long
    // the API call took rather than adding to it. Otherwise a slow batch
    // silently stretches the window past what was asked for.
    if (i + BATCH < pending.length && gapMs > 0) {
      const wait = Math.max(0, gapMs - (Date.now() - batchStarted));
      if (wait > 0) await sleep(wait);
    }
  }

  console.log(`\nComplete. Sent ${sent}, failed ${failed}.\n`);

  /// ONE statement, never N updates in a transaction: that is what blew
  /// Prisma's 5s interactive limit mid-campaign and left delivered mail
  /// unrecorded, which is what causes a double-send on resume.
  async function stamp(ids: string[], msgs: string[]) {
    if (ids.length === 0) return;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await prisma.$executeRaw`
          UPDATE "CampaignSend" AS c
             SET "sentAt" = now(), "resendMsgId" = NULLIF(v.msg, '')
            FROM (SELECT unnest(${ids}::text[]) AS id, unnest(${msgs}::text[]) AS msg) v
           WHERE c.id = v.id AND c."sentAt" IS NULL`;
        return;
      } catch (e) {
        console.warn(`  stamp attempt ${attempt}: ${(e as Error).message}`);
        await sleep(1500 * attempt);
      }
    }
    console.error(`\nABORT: ${ids.length} messages were DELIVERED but not stamped.\n`);
    process.exit(3);
  }
}

main()
  .catch((err) => {
    console.error("FAILED:", (err as Error).message);
    process.exit(1);
  })
  .finally(async () => {
    await getPrismaClient().$disconnect();
  });
