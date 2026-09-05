// Founding Falcon invitation: the earliest traders, by volume.
//
// THE AUDIENCE IS NOT THE WAITLIST, which is the whole reason this script
// exists rather than another flag on the claim sender. The cohort is computed
// from `user_volume_daily` in the TERMINAL's database, and 37 of its 109
// members never joined the waitlist -- they signed up to the product directly.
// A waitlist-driven send would silently drop them, and they are among the most
// valuable people on the list.
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
//   pnpm exec tsx scripts/send-founding-falcon.ts --dry-run
//   pnpm exec tsx scripts/send-founding-falcon.ts --send

import "dotenv/config";
import { closeSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";

import { Resend } from "resend";

import { getPrismaClient } from "../src/lib/prisma";
import { getTrenchersPool } from "../src/lib/trenchers-db";
import { isMailable } from "../src/lib/falcon-claim-audience";
import { FOUNDING_FALCON_SUBJECT, buildFoundingFalconText } from "../src/lib/email";

const CAMPAIGN = "founding-falcon-2026-09";
/// All-time volume that defines the cohort. Chosen because it yields the
/// "first 100+ traders" the programme was described around: 109 people, of
/// whom 98 traded in the last 30 days. $1,000 would give 142 and $10,000 would
/// give 72.
const MIN_VOLUME_USD = 5000;
const BATCH = 100;
const LOCK = "/tmp/founding-falcon-send.lock";

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

  // 1. The cohort, from the terminal's database.
  const vol = await pool.query<{ email: string; total: string }>(
    `SELECT lower(u.email) AS email, sum(d.volume_usd)::text AS total
       FROM user_volume_daily d JOIN users u ON u.id = d.user_id
      WHERE u.email IS NOT NULL
      GROUP BY 1 HAVING sum(d.volume_usd) >= $1 ORDER BY 2 DESC`,
    [MIN_VOLUME_USD],
  );
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
  const priorOptOut = await prisma.campaignSend.findMany({
    where: { email: { in: cohort }, unsubscribedAt: { not: null } },
    select: { email: true },
  });
  for (const r of priorOptOut) blocked.add(r.email.toLowerCase());

  const audience = cohort.filter((e) => !blocked.has(e));

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

  console.log(`\nFounding Falcon — ${CAMPAIGN}`);
  console.log(`  cohort (>= $${MIN_VOLUME_USD.toLocaleString()} volume): ${cohort.length}`);
  console.log(`  suppressed (opted out / unreachable): ${blocked.size}`);
  console.log(`  to send now: ${pending.length}`);
  console.log(`  subject: ${FOUNDING_FALCON_SUBJECT}`);
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
    const payload = chunk.map((row) => {
      const unsubscribeUrl = `${siteUrl}/api/survey/unsubscribe?token=${row.token}&c=founding-falcon`;
      return {
        from: fromEmail,
        to: row.email,
        subject: FOUNDING_FALCON_SUBJECT,
        // Text only. See buildFoundingFalconText for why there is no HTML twin.
        text: buildFoundingFalconText({ unsubscribeUrl }),
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
    console.log(`  batch ${n}: sent ${sent}, failed ${failed}`);
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
