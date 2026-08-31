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
// The column is new, so on the first run EVERY subscriber is missing one, not
// just the 1,801. The invited majority simply had a working link by another
// route; now they all have one by the same route.
//
// ONE STATEMENT, NOT N UPDATES. The first version of this script issued 500
// `update()` calls inside `prisma.$transaction([...])` and died on Prisma's
// 5s interactive-transaction limit at 5,174ms -- 500 sequential round trips
// through the Supabase pooler cannot finish in five seconds, and the whole
// chunk rolls back. Tokens are generated IN Postgres instead, so the work is
// a single statement and the round trips disappear. `gen_random_uuid()` is
// VOLATILE and core since PG13, so it is evaluated per row (no extension
// needed) and two rows cannot share a value.
//
// IDEMPOTENT. `WHERE "unsubscribeToken" IS NULL`, so re-running after new
// signups tops up only the new ones and never rotates an existing token.
// Rotating would silently break the unsubscribe link in mail already
// delivered, which is the one failure this script exists to prevent.
//
// Run AFTER `prisma db push` has added the column.
//
//   pnpm exec tsx scripts/backfill-unsubscribe-tokens.ts --dry-run
//   pnpm exec tsx scripts/backfill-unsubscribe-tokens.ts

import "dotenv/config";

import { getPrismaClient } from "../src/lib/prisma";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = getPrismaClient();

  const missing = await prisma.waitlistSubscriber.count({
    where: { unsubscribeToken: null },
  });

  console.log(`\nBackfill unsubscribe tokens`);
  console.log(`  subscribers missing a token: ${missing}`);
  console.log(`  mode: ${dryRun ? "DRY RUN — nothing is written" : "live"}\n`);
  if (dryRun || missing === 0) return;

  // Two UUIDs with the dashes stripped: 64 hex characters, URL-safe by
  // construction, and 256 bits of entropy behind an endpoint that takes no
  // other authentication.
  const filled = await prisma.$executeRaw`
    UPDATE "WaitlistSubscriber"
       SET "unsubscribeToken" =
             replace(gen_random_uuid()::text, '-', '') ||
             replace(gen_random_uuid()::text, '-', '')
     WHERE "unsubscribeToken" IS NULL`;

  const left = await prisma.waitlistSubscriber.count({
    where: { unsubscribeToken: null },
  });
  const dupes = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*)::bigint AS n FROM (
      SELECT "unsubscribeToken" FROM "WaitlistSubscriber"
       WHERE "unsubscribeToken" IS NOT NULL
       GROUP BY 1 HAVING count(*) > 1
    ) d`;

  console.log(`  filled:     ${filled}`);
  console.log(`  still null: ${left}   (expect 0)`);
  console.log(`  duplicates: ${dupes[0]?.n ?? 0}   (expect 0)\n`);
}

main()
  .catch((err) => {
    console.error("FAILED:", (err as Error).message);
    process.exit(1);
  })
  .finally(async () => {
    await getPrismaClient().$disconnect();
  });
