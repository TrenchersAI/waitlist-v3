// Give every waitlist subscriber an unsubscribe token.
//
// WHY THIS EXISTS. Opt-out tokens used to live only on SurveyInvite and
// BetaInvite. A subscriber holding neither -- 1,801 of 14,199 -- had a
// `List-Unsubscribe` header and a footer link that both resolved to a 404.
// That is survivable on wave-scoped sends, which only ever reached people who
// had an invite. It is not survivable on a whole-list send, which reaches
// exactly the people who have neither: someone who wants out and cannot get
// out reports spam instead, and a complaint costs far more reputation than an
// unsubscribe on a domain that also carries our OTP login mail.
//
// IDEMPOTENT. Only fills rows where the token IS NULL, so re-running after new
// signups tops up the new ones and never rotates an existing token. Rotating
// would silently break the unsubscribe link in mail already delivered.
//
// Run AFTER `prisma db push` has added the column.
//
//   pnpm exec tsx scripts/backfill-unsubscribe-tokens.ts --dry-run
//   pnpm exec tsx scripts/backfill-unsubscribe-tokens.ts

import "dotenv/config";
import { randomBytes } from "node:crypto";

import { getPrismaClient } from "../src/lib/prisma";

/// Same shape the survey and beta tokens use: 24 random bytes, base64url.
/// Opaque, URL-safe, and far past guessing range for a one-click endpoint
/// that takes no other authentication.
const newToken = () => randomBytes(24).toString("base64url");

/// Chunked so one oversized transaction cannot fail the whole run, and so
/// progress is visible on a list this size.
const CHUNK = 500;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = getPrismaClient();

  const missing = await prisma.waitlistSubscriber.findMany({
    where: { unsubscribeToken: null },
    select: { id: true },
  });

  console.log(`\nBackfill unsubscribe tokens`);
  console.log(`  subscribers missing a token: ${missing.length}`);
  console.log(`  mode: ${dryRun ? "DRY RUN — nothing is written" : "live"}\n`);
  if (dryRun || missing.length === 0) return;

  let done = 0;
  for (let i = 0; i < missing.length; i += CHUNK) {
    const chunk = missing.slice(i, i + CHUNK);
    // One statement per chunk rather than N updates: parallel per-row writes
    // are what exhausted the Supabase pooler during an earlier send.
    await prisma.$transaction(
      chunk.map((row) =>
        prisma.waitlistSubscriber.update({
          where: { id: row.id },
          data: { unsubscribeToken: newToken() },
        }),
      ),
    );
    done += chunk.length;
    console.log(`  ${done}/${missing.length}`);
  }

  const left = await prisma.waitlistSubscriber.count({
    where: { unsubscribeToken: null },
  });
  console.log(`\nDone. ${done} filled, ${left} still missing (expect 0).\n`);
}

main()
  .catch((err) => {
    console.error("FAILED:", (err as Error).message);
    process.exit(1);
  })
  .finally(async () => {
    await getPrismaClient().$disconnect();
  });
