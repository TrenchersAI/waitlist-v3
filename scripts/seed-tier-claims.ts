// Seed the terminal's `tier_claim_grants` eligibility list from the waitlist.
//
// WHAT THIS IS FOR. A tier attaches to a terminal user id, and most of the
// people we are promising Falcon to do not have one: 14,199 addresses on the
// waitlist, ~542 with an account. Writing a row per address means the grant can
// be redeemed whenever they eventually sign up, by them, instead of being
// pushed by a watcher that only runs while an operator's laptop is awake.
//
// WHERE IT WRITES, AND WHY THAT IS A CHOICE. This inserts into the TRENCHERS
// database, not this app's own. The eligibility list has to live beside the
// thing it grants: the claim endpoint resolves it inside the same transaction
// that writes the tier, and a check that had to cross into this service would
// make a permanent rate change depend on a marketing app being up. This script
// is the ONLY writer, the insert is idempotent, and nothing here ever updates
// or deletes a row.
//
// IDEMPOTENT BY CONSTRUCTION. `ON CONFLICT (email, campaign) DO NOTHING`, so
// re-running after new signups adds only the new ones. A row already redeemed
// stays redeemed — this can never resurrect a spent claim or hand anyone a
// second one.
//
// ORDER OF OPERATIONS. The table ships in solana-terminal migration
// 20260829000001. Run this only after that has been deployed, or every insert
// fails on a missing relation.
//
// Usage:
//   pnpm exec tsx scripts/seed-tier-claims.ts --dry-run
//   pnpm exec tsx scripts/seed-tier-claims.ts
//   pnpm exec tsx scripts/seed-tier-claims.ts --exclude-waves wave-5-farm

import "dotenv/config";

import { getPrismaClient } from "../src/lib/prisma";
import { getTrenchersPool } from "../src/lib/trenchers-db";

/// Rank::ordinal on the backend — 5 = Titan, displayed as "Falcon".
const FALCON_ORDINAL = 5;
/// Names the promise. A later campaign can grant a different tier to an
/// overlapping audience without either one having to know about the other.
const CAMPAIGN = "waitlist-falcon-2026-08";
/// Chunked so one oversized parameter array cannot fail the whole run, and so
/// progress is visible on a list this size.
const CHUNK = 2_000;

function parseArgs() {
  const args = process.argv.slice(2);
  const read = (flag: string) => {
    const i = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
    if (i < 0) return undefined;
    return args[i].includes("=") ? args[i].split("=").slice(1).join("=") : args[i + 1];
  };
  const excl = read("--exclude-waves");
  return {
    dryRun: args.includes("--dry-run"),
    excludeWaves: excl ? excl.split(",").map((w) => w.trim()).filter(Boolean) : [],
  };
}

async function main() {
  const { dryRun, excludeWaves } = parseArgs();
  const prisma = getPrismaClient();
  const pool = getTrenchersPool();
  if (!pool) throw new Error("TRENCHERS_DATABASE_URL is not set.");

  // Everyone who ever signed up, not just those with a beta invite: 14,199
  // subscribers against 10,459 invites, and the promise is being made to the
  // whole list.
  const subs = await prisma.waitlistSubscriber.findMany({
    select: { email: true, betaInvite: { select: { wave: true } } },
  });

  // Unsubscribing is a mail preference, NOT a refusal of the reward. Excluding
  // those addresses would quietly withdraw something we are about to tell
  // people they have; they simply will not be mailed about it.
  const kept = subs.filter((s) => {
    if (excludeWaves.length === 0) return true;
    const wave = s.betaInvite?.wave;
    return wave == null || !excludeWaves.includes(wave);
  });

  const emails = [
    ...new Set(
      kept
        .map((s) => s.email.trim().toLowerCase())
        .filter((e) => e.includes("@") && e.length > 3),
    ),
  ];

  console.log(`\nSeed tier claims — ${CAMPAIGN}`);
  console.log(`Subscribers:      ${subs.length}`);
  if (excludeWaves.length > 0) {
    console.log(`Excluded waves:   ${excludeWaves.join(", ")} (${subs.length - kept.length} rows)`);
  }
  console.log(`Unique addresses: ${emails.length}`);
  console.log(`Grants:           Falcon (rank ordinal ${FALCON_ORDINAL}), permanent`);
  console.log(`Mode:             ${dryRun ? "DRY RUN — nothing is written" : "live"}\n`);

  if (dryRun) {
    // Show what already exists so a dry run reports the true delta rather than
    // implying every address is new.
    const { rows } = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM tier_claim_grants
        WHERE campaign = $1 AND email = ANY($2::text[])`,
      [CAMPAIGN, emails],
    );
    const already = Number(rows[0]?.n ?? 0);
    console.log(`  already seeded: ${already}`);
    console.log(`  would insert:   ${emails.length - already}`);
    console.log(`  sample:         ${emails.slice(0, 3).join(", ")}`);
    await pool.end();
    return;
  }

  let inserted = 0;
  for (let i = 0; i < emails.length; i += CHUNK) {
    const chunk = emails.slice(i, i + CHUNK);
    const res = await pool.query(
      `INSERT INTO tier_claim_grants (email, tier, campaign)
       SELECT DISTINCT unnest($1::text[]), $2, $3
       ON CONFLICT (email, campaign) DO NOTHING`,
      [chunk, FALCON_ORDINAL, CAMPAIGN],
    );
    inserted += res.rowCount ?? 0;
    console.log(`  ${Math.min(i + CHUNK, emails.length)}/${emails.length}  (+${res.rowCount ?? 0})`);
  }

  const { rows } = await pool.query<{ n: string; claimed: string }>(
    `SELECT count(*)::text AS n,
            count(*) FILTER (WHERE claimed_at IS NOT NULL)::text AS claimed
       FROM tier_claim_grants WHERE campaign = $1`,
    [CAMPAIGN],
  );
  console.log(`\nInserted ${inserted} new rows.`);
  console.log(`Campaign total: ${rows[0]?.n ?? "?"} (claimed so far: ${rows[0]?.claimed ?? "0"})\n`);
  await pool.end();
}

main().catch((err) => {
  console.error("FAILED:", (err as Error).message);
  process.exit(1);
});
