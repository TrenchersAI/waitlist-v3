// One-shot script: send the survey invite to every verified waitlist
// subscriber that hasn't been invited yet for this campaign. Idempotent —
// re-running picks up new verifieds without re-emailing anyone who
// already has a SurveyInvite. Resume-friendly if it crashes mid-send:
// invites are created up-front, sentAt is only set after Resend accepts.
//
// Usage:
//   pnpm exec tsx scripts/send-survey-batch.ts               # dry-run
//   pnpm exec tsx scripts/send-survey-batch.ts --send        # really send
//   pnpm exec tsx scripts/send-survey-batch.ts --send --limit 5
//   pnpm exec tsx scripts/send-survey-batch.ts --send --only=you@example.com
//
// Required env:
//   DATABASE_URL, RESEND_API_KEY, RESEND_FROM_EMAIL
//   NEXT_PUBLIC_SITE_URL (used for the survey + unsubscribe links)

import { randomBytes } from "node:crypto";

import { sendSurveyInviteEmail } from "../src/lib/email";
import { getPrismaClient } from "../src/lib/prisma";
import { SURVEY_CAMPAIGN } from "../src/lib/survey";

const CHUNK_SIZE = 25;
// Conservative pacing on the default Resend tier — 10 req/s shared
// across the whole account. Sleeping ~1.5s between chunks of 25 keeps
// us well under and avoids rate-limit errors during a 2k blast.
const SLEEP_MS_BETWEEN_CHUNKS = 1500;

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

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.WAITLIST_SITE_URL ??
    "https://trenchers.ai";

  console.log(`\nSurvey campaign: ${SURVEY_CAMPAIGN}`);
  console.log(`Site URL:        ${siteUrl}`);
  console.log(`Mode:            ${send ? "LIVE SEND" : "dry-run (use --send)"}`);
  if (only) console.log(`Only:            ${only}`);
  if (limit) console.log(`Limit:           ${limit}`);

  // Verified subscribers who don't yet have an invite for this campaign.
  // Using a left-join via Prisma's `surveyInvite: null` is the cleanest
  // way to express "no invite exists yet" — but the relation is unique-
  // by-subscriber and campaign is a column on the invite, so we just
  // check surveyInvite is null. (Re-running this script for a *second*
  // campaign would need a different query.)
  const candidates = await prisma.waitlistSubscriber.findMany({
    where: {
      isVerified: true,
      surveyInvite: null,
      ...(only ? { email: only.toLowerCase() } : {}),
    },
    select: { id: true, email: true },
    orderBy: { verifiedAt: "asc" },
    take: limit,
  });

  console.log(`\nFound ${candidates.length} verified subscribers without invites.`);

  if (candidates.length === 0) {
    console.log("Nothing to do. Exiting.");
    return;
  }

  if (!send) {
    console.log("\nDry-run. Showing first 5:");
    for (const c of candidates.slice(0, 5)) {
      console.log(`  ${c.email}`);
    }
    console.log("\nRun with --send to actually email.");
    return;
  }

  // Create invite rows first. A single transaction would be simpler but
  // 2k rows in one tx hits transaction-size limits on Supabase; chunked
  // inserts are safer and the script remains idempotent because of the
  // unique constraint on subscriberId.
  console.log("\nCreating SurveyInvite rows…");
  const invites: { id: string; email: string; token: string }[] = [];
  for (const c of candidates) {
    try {
      const token = generateToken();
      const created = await prisma.surveyInvite.create({
        data: {
          campaign: SURVEY_CAMPAIGN,
          subscriberId: c.id,
          token,
        },
        select: { id: true, token: true },
      });
      invites.push({ id: created.id, email: c.email, token: created.token });
    } catch (err) {
      // Likely a unique-constraint violation if we partially ran already.
      // Skip and continue.
      console.warn(`  skip ${c.email}: ${(err as Error).message}`);
    }
  }
  console.log(`Prepared ${invites.length} invites.\n`);

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < invites.length; i += CHUNK_SIZE) {
    const chunk = invites.slice(i, i + CHUNK_SIZE);

    await Promise.all(
      chunk.map(async (inv) => {
        const surveyUrl = `${siteUrl}/survey/${inv.token}`;
        const unsubscribeUrl = `${siteUrl}/api/survey/unsubscribe?token=${inv.token}`;
        try {
          const result = await sendSurveyInviteEmail({
            to: inv.email,
            surveyUrl,
            unsubscribeUrl,
            inviteId: inv.id,
            campaign: SURVEY_CAMPAIGN,
          });
          if ("skipped" in result) {
            failed++;
            console.warn(
              `  ${inv.email}: skipped (RESEND_API_KEY not set)`,
            );
            return;
          }
          await prisma.surveyInvite.update({
            where: { id: inv.id },
            data: {
              sentAt: new Date(),
              resendMsgId: result.id ?? undefined,
            },
          });
          sent++;
        } catch (err) {
          failed++;
          console.warn(
            `  ${inv.email}: send failed: ${(err as Error).message}`,
          );
        }
      }),
    );

    const done = Math.min(i + CHUNK_SIZE, invites.length);
    console.log(
      `Progress: ${done}/${invites.length} (sent ${sent}, failed ${failed})`,
    );

    if (i + CHUNK_SIZE < invites.length) {
      await sleep(SLEEP_MS_BETWEEN_CHUNKS);
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
