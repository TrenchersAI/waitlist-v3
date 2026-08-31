// Seventh send: the public-beta launch note, gifting Falcon to the WHOLE
// waitlist and asking each recipient to claim it.
//
// HOW THIS DIFFERS FROM send-beta-falcon.ts, its closest sibling.
//
// 1. IT IS LIST-WIDE, NOT WAVE-SCOPED. The Falcon thank-you went to wave 1
//    and thanked them for feedback. This one goes to all 14,199 addresses,
//    3,740 of which have no BetaInvite row at all, so it drives off
//    WaitlistSubscriber and stamps its columns there.
//
// 2. IT NEEDS NO GRANT WATCHER. The old mail said "you now hold Falcon" and
//    had a hard precondition that the tier was already applied, per address,
//    before sending -- phase 2 even refused to start without a watcher
//    running. This mail says the tier is waiting to be CLAIMED, which is true
//    the moment `tier_claim_grants` is seeded. That seed is done: 14,199 rows
//    are live in production. Nothing here has to race a background process.
//
// 3. EVERY RECIPIENT CAN UNSUBSCRIBE. Opt-out tokens used to live only on the
//    invite tables, so the 1,801 subscribers holding neither had a
//    `List-Unsubscribe` header and footer link that resolved to a 404. On a
//    wave-scoped send that never mattered, because those people were never
//    reached. Here they are precisely the population being mailed. This
//    script REFUSES to send to a subscriber with no token rather than mail a
//    dead opt-out link: someone who wants out and cannot get out reports spam
//    instead, and a complaint costs far more than an unsubscribe on a domain
//    that also carries our OTP login mail.
//
// SUPPRESSION. Skips anyone unsubscribed (subscriber OR either invite -- the
// opt-out is global), anyone whose address hard-bounced or was suppressed on a
// previous send, and anyone already sent this campaign. Re-running after an
// abort resumes rather than duplicating.
//
// PACING. `--hours` spreads the run across a window instead of firing as fast
// as the API allows. The default is deliberately slow: 14,199 messages against
// a ~25,000 lifetime history is already the largest single send this domain
// has done, and a volume spike is itself a spam signal independent of content.
//
// REPUTATION GATE. Bounce and complaint rates are re-read every batch and the
// run ABORTS mid-flight if either crosses the threshold, so a bad list costs
// one batch rather than the whole send.
//
// Usage:
//   pnpm exec tsx scripts/send-beta-falcon-claim.ts --dry-run
//   pnpm exec tsx scripts/send-beta-falcon-claim.ts --send --hours 10
//   pnpm exec tsx scripts/send-beta-falcon-claim.ts --send --exclude-waves wave-5-farm
//   pnpm exec tsx scripts/send-beta-falcon-claim.ts --send --limit 200   # first batch only

import "dotenv/config";

import { Resend } from "resend";

import { getPrismaClient } from "../src/lib/prisma";
import {
  BETA_FALCON_CLAIM_SUBJECT,
  buildBetaFalconClaimHtml,
  buildBetaFalconClaimText,
} from "../src/lib/email";

const CAMPAIGN = "beta-falcon-claim";
/// Resend's batch endpoint cap.
const MAX_BATCH = 100;
/// Slower than the 4 hours first proposed. See PACING above.
const DEFAULT_HOURS = 10;

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
  const excl = read("--exclude-waves");
  return {
    send: args.includes("--send"),
    dryRun: args.includes("--dry-run") || !args.includes("--send"),
    trackOpens: args.includes("--track-opens"),
    hours: num(read("--hours")) ?? DEFAULT_HOURS,
    // Only override when --batch was actually PASSED: clamping an absent flag
    // through Math.max(1, ...) yields 1, which is truthy, so a `|| default`
    // fallback never fires and every send silently becomes one API call each.
    batch:
      read("--batch") == null
        ? MAX_BATCH
        : Math.min(MAX_BATCH, Math.max(1, num(read("--batch")) ?? 1)),
    limit: num(read("--limit")) ?? Infinity,
    excludeWaves: excl
      ? excl.split(",").map((w) => w.trim()).filter(Boolean)
      : [],
  };
}

/// Live rates for THIS campaign. Read fresh every batch so a spike stops the
/// remainder rather than being noticed afterwards.
async function reputation() {
  const prisma = getPrismaClient();
  const [sent, bounced, complained] = await Promise.all([
    prisma.waitlistSubscriber.count({ where: { falconClaimSentAt: { not: null } } }),
    prisma.waitlistSubscriber.count({ where: { falconClaimBouncedAt: { not: null } } }),
    prisma.waitlistSubscriber.count({ where: { falconClaimComplainedAt: { not: null } } }),
  ]);
  return { sent, bounced, complained };
}

/// Same thresholds the Falcon send used. Below 200 delivered there is not
/// enough signal to judge, and aborting on one early bounce would stop a
/// healthy run.
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
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.trenchers.ai").replace(/\/$/, "");
  const accessUrl = process.env.BETA_ACCESS_URL ?? "https://beta.trenchers.ai";
  const replyTo = process.env.RESEND_REPLY_TO ?? "team@trenchers.ai";

  // ONE fetch, then filter in TypeScript, and that is deliberate rather than
  // lazy. The first version used two Prisma queries -- one with
  // `betaInvite: { is: {...clean} }`, plus a second for the no-invite case --
  // because an `is:` filter on a to-one relation EXCLUDES rows where the
  // relation is null, which would have silently dropped the 3,740 subscribers
  // with no BetaInvite: exactly the population this send exists to reach.
  //
  // The union of those two queries then leaked. `OR: [betaInvite is null,
  // surveyInvite is null]` matched people who were missing ONE invite without
  // ever checking the status on the other, so 13 addresses that had already
  // unsubscribed came back as mailable. Thirteen unsubscribed people mailed
  // anyway is a complaint spike, which is the single most expensive signal a
  // domain carrying OTP login mail can produce.
  //
  // Null-tolerant boolean logic is hard to express once and easy to express
  // twice, so it is expressed once, here, where it can be read. 14,199 rows
  // is nothing to hold in memory.
  const everyone = await prisma.waitlistSubscriber.findMany({
    select: {
      id: true,
      email: true,
      unsubscribeToken: true,
      falconClaimSentAt: true,
      unsubscribedAt: true,
      betaInvite: {
        select: {
          wave: true,
          unsubscribedAt: true,
          bouncedAt: true,
          complainedAt: true,
          suppressedAt: true,
        },
      },
      surveyInvite: { select: { unsubscribedAt: true } },
    },
  });

  /// Addresses a provider will actually accept.
  ///
  /// Resend rejects an ENTIRE batch if a single `to` is malformed, and reports
  /// only "Invalid `to` field" without naming the offender -- so one bad
  /// address costs ~100 reachable people per batch and gives you nothing to
  /// debug with. The first full run died on batch 1 twice for this reason.
  ///
  /// A WHITELIST, not a blacklist, and that is the lesson. The first attempt
  /// banned a list of characters it could think of and still let `g^@g.com`
  /// through, because a caret was not on the list. Enumerating what is allowed
  /// is finite; enumerating what is forbidden is not.
  ///
  /// Deliberately stricter than RFC 5322 and close to what mailbox providers
  /// enforce -- the question is "will this send", not "is this technically
  /// legal". Seven addresses on this list fail it: a 200-character local part
  /// (limit 64), one ending in a dot, a quoted local part, a caret, a
  /// single-letter TLD, and two numeric TLDs.
  const ADDRESS =
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
  const mailable = (email: string) => {
    if (email !== email.trim() || email.length > 254) return false;
    const local = email.split("@")[0] ?? "";
    if (local.length > 64) return false;
    if (/^\.|\.$|\.\./.test(local)) return false;
    return ADDRESS.test(email);
  };

  /// An opt-out is GLOBAL, so it counts from wherever it was recorded. A hard
  /// bounce or a Resend suppression means the address is unreachable: mailing
  /// it again cannot succeed and costs reputation to fail.
  const suppressed = (r: (typeof everyone)[number]) =>
    r.unsubscribedAt != null ||
    r.surveyInvite?.unsubscribedAt != null ||
    r.betaInvite?.unsubscribedAt != null ||
    r.betaInvite?.bouncedAt != null ||
    r.betaInvite?.complainedAt != null ||
    r.betaInvite?.suppressedAt != null;

  const unmailable = everyone.filter(
    (r) => r.falconClaimSentAt == null && !suppressed(r) && !mailable(r.email),
  );
  let pending = everyone.filter(
    (r) => r.falconClaimSentAt == null && !suppressed(r) && mailable(r.email),
  );
  const excludedSuppressed = everyone.length - everyone.filter((r) => !suppressed(r)).length;

  if (opts.excludeWaves.length > 0) {
    pending = pending.filter((r) => {
      const w = r.betaInvite?.wave;
      return w == null || !opts.excludeWaves.includes(w);
    });
  }

  // A dead unsubscribe link is worse than not mailing at all. Refuse rather
  // than send one, and say how to fix it.
  const tokenless = pending.filter((r) => !r.unsubscribeToken);
  if (tokenless.length > 0) {
    console.error(
      `\n${tokenless.length} recipients have no unsubscribe token, so their ` +
        `List-Unsubscribe header would 404.\nRun: pnpm exec tsx scripts/backfill-unsubscribe-tokens.ts\n`,
    );
    process.exit(1);
  }

  // Pace off the FULL list, then apply the limit. Deriving the gap from the
  // limited set instead makes `--limit 200` compute two batches and space them
  // by the whole window -- a ten-hour sleep between two test batches. The rate
  // is a property of the campaign, not of how much of it this run does.
  const fullBatches = Math.ceil(pending.length / opts.batch);
  const gapMs =
    fullBatches > 1 ? Math.floor((opts.hours * 3_600_000) / (fullBatches - 1)) : 0;

  if (pending.length > opts.limit) pending = pending.slice(0, opts.limit);
  const batches = Math.ceil(pending.length / opts.batch);

  console.log(`\nFalcon CLAIM send — ${CAMPAIGN}`);
  console.log(`  recipients:  ${pending.length}`);
  console.log(`  suppressed:  ${excludedSuppressed} (opted out, bounced or unreachable)`);
  if (unmailable.length > 0) {
    console.log(`  unmailable:  ${unmailable.length} (malformed address, would fail its whole batch)`);
    for (const u of unmailable) console.log(`      ${JSON.stringify(u.email)}`);
  }
  if (opts.excludeWaves.length) console.log(`  excluded:    ${opts.excludeWaves.join(", ")}`);
  console.log(`  batches:     ${batches} x ${opts.batch}`);
  console.log(`  window:      ${opts.hours}h  (~${Math.round(gapMs / 1000)}s between batches)`);
  console.log(`  subject:     ${BETA_FALCON_CLAIM_SUBJECT}`);
  console.log(`  mode:        ${opts.dryRun ? "DRY RUN — nothing is sent" : "LIVE"}\n`);

  const start = await reputation();
  console.log(`  campaign so far: sent ${start.sent}, bounced ${start.bounced}, complained ${start.complained}`);
  if (opts.dryRun) {
    console.log(`  sample: ${pending.slice(0, 3).map((r) => r.email).join(", ")}\n`);
    return;
  }

  const resend = new Resend(apiKey);
  let sentCount = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += opts.batch) {
    const n = Math.floor(i / opts.batch) + 1;
    const chunk = pending.slice(i, i + opts.batch);
    const started = Date.now();

    const live = await reputation();
    const stop = gate(live);
    if (stop) {
      console.error(`\nABORT mid-run at batch ${n}: ${stop}`);
      process.exit(2);
    }

    const payload = await Promise.all(
      chunk.map(async (row) => {
        const unsubscribeUrl = `${siteUrl}/api/survey/unsubscribe?token=${row.unsubscribeToken}&c=falcon-claim`;
        const copy = { accessUrl, unsubscribeUrl, recipientEmail: row.email };
        return {
          from: fromEmail,
          to: row.email,
          subject: BETA_FALCON_CLAIM_SUBJECT,
          html: await buildBetaFalconClaimHtml(copy),
          text: buildBetaFalconClaimText(copy),
          replyTo,
          // One-click opt-out. Gmail and Yahoo both require it on bulk mail,
          // and its absence is itself a Promotions/spam signal.
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "campaign", value: CAMPAIGN },
            { name: "subscriberId", value: row.id },
            { name: "kind", value: "falcon-claim" },
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
        console.warn(`  batch ${n}: error (attempt ${a}) — ${result.error.message}`);
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
        // ONE stamping statement per batch, not N. Parallel per-row writes are
        // what exhausted the Supabase pooler and killed an earlier send.
        // Retried hard, because the mail is already delivered: an unstamped
        // row looks pending and gets mailed a SECOND time on the next run.
        // ONE statement, not N updates in a transaction. The first live batch
        // delivered 100 messages and then could not stamp them: 100 sequential
        // updates through the Supabase pooler blew Prisma's 5s interactive
        // limit at 5,214ms, all four retries hit the same wall, and the run
        // aborted holding mail that was already out. `unnest` of two arrays
        // does the same work in a single round trip.
        const subIds = chunk.map((r) => r.id);
        const msgIds = chunk.map((_, k) => ids[k]?.id ?? "");
        let stamped = false;
        for (let attempt = 1; attempt <= 4 && !stamped; attempt++) {
          try {
            await prisma.$executeRaw`
              UPDATE "WaitlistSubscriber" AS w
                 SET "falconClaimSentAt" = now(),
                     "falconClaimResendMsgId" = NULLIF(v.msg, '')
                FROM (SELECT unnest(${subIds}::text[]) AS id,
                             unnest(${msgIds}::text[]) AS msg) v
               WHERE w.id = v.id AND w."falconClaimSentAt" IS NULL`;
            stamped = true;
          } catch (e) {
            console.warn(`  batch ${n}: stamp attempt ${attempt} failed — ${(e as Error).message}`);
            await sleep(1500 * attempt);
          }
        }
        if (!stamped) {
          console.error(
            `\nABORT: batch ${n} was DELIVERED but could not be stamped. ` +
              `Re-running now would mail those ${chunk.length} people twice. ` +
              `Fix the database before resuming.\n`,
          );
          process.exit(3);
        }
        sentCount += chunk.length;
      }
    } catch (err) {
      failed += chunk.length;
      console.warn(`  batch ${n}: threw — ${(err as Error).message}`);
    }

    console.log(`  batch ${n}/${batches}: sent ${sentCount}, failed ${failed}`);
    if (i + opts.batch < pending.length) {
      const wait = Math.max(0, gapMs - (Date.now() - started));
      if (wait > 0) await sleep(wait);
    }
  }

  const final = await reputation();
  console.log(`\nComplete. Sent ${sentCount}, failed ${failed}.`);
  console.log(`  campaign totals: sent ${final.sent}, bounced ${final.bounced}, complained ${final.complained}\n`);
}

main()
  .catch((err) => {
    console.error("FAILED:", (err as Error).message);
    process.exit(1);
  })
  .finally(async () => {
    await getPrismaClient().$disconnect();
  });
