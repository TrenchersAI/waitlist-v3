// Creates one BetaInvite row per mailable subscriber, stamped with the wave
// they belong to. Idempotent: re-running only fills gaps, and never rewrites
// the wave of a row that has already been sent (so the record of what we
// actually mailed stays honest even if the grading logic changes later).
//
// This is deliberately separate from the send script. Preparing the rows is
// safe and inspectable; sending is not. Run this, eyeball the tally, then
// send.
//
//   pnpm exec tsx scripts/prepare-beta-invites.ts            # dry-run
//   pnpm exec tsx scripts/prepare-beta-invites.ts --write

import "dotenv/config";
import { randomBytes } from "node:crypto";

import { gradeAudience, tallyWaves } from "../src/lib/beta-audience";
import { BETA_CAMPAIGN, WAVE_LABELS, WAVE_ORDER } from "../src/lib/beta-invite";
import { getPrismaClient } from "../src/lib/prisma";

function generateToken() {
  return randomBytes(24).toString("base64url");
}

async function main() {
  const write = process.argv.includes("--write");
  const prisma = getPrismaClient();

  const graded = await gradeAudience();
  const tally = tallyWaves(graded);
  const mailable = graded.filter((g) => g.wave !== "excluded");

  console.log(`\nPrepare beta invites - ${BETA_CAMPAIGN}`);
  console.log(`Mode: ${write ? "WRITE" : "dry-run (use --write)"}\n`);
  for (const wave of WAVE_ORDER) {
    console.log(
      `  ${wave.padEnd(20)} ${String(tally[wave]).padStart(6)}  ${WAVE_LABELS[wave]}`,
    );
  }
  console.log(`  ${"excluded".padEnd(20)} ${String(tally.excluded).padStart(6)}`);
  console.log(`\nMailable: ${mailable.length}`);

  const existing = await prisma.betaInvite.findMany({
    where: { campaign: BETA_CAMPAIGN },
    select: { subscriberId: true, sentAt: true, wave: true },
  });
  const bySubscriber = new Map(existing.map((e) => [e.subscriberId, e]));

  const toCreate = mailable.filter((m) => !bySubscriber.has(m.subscriberId));
  // A row whose wave changed but which has NOT been sent yet can be
  // re-graded safely. One that has already gone out is frozen.
  const toRegrade = mailable.filter((m) => {
    const row = bySubscriber.get(m.subscriberId);
    return row && !row.sentAt && row.wave !== m.wave;
  });

  console.log(`Existing rows: ${existing.length}`);
  console.log(`To create:     ${toCreate.length}`);
  console.log(`To re-grade:   ${toRegrade.length}`);

  if (!write) {
    console.log("\nDry-run. Re-run with --write to persist.");
    return;
  }

  let created = 0;
  // Chunked createMany rather than a loop of creates: 10k round trips is
  // minutes, one batched insert is seconds.
  const CHUNK = 500;
  for (let i = 0; i < toCreate.length; i += CHUNK) {
    const slice = toCreate.slice(i, i + CHUNK);
    const res = await prisma.betaInvite.createMany({
      data: slice.map((s) => ({
        campaign: BETA_CAMPAIGN,
        subscriberId: s.subscriberId,
        wave: s.wave,
        token: generateToken(),
      })),
      skipDuplicates: true,
    });
    created += res.count;
    process.stdout.write(`\r  created ${created}/${toCreate.length}`);
  }
  if (toCreate.length > 0) process.stdout.write("\n");

  let regraded = 0;
  for (const r of toRegrade) {
    await prisma.betaInvite.update({
      where: { subscriberId: r.subscriberId },
      data: { wave: r.wave },
    });
    regraded++;
  }

  console.log(`\nCreated ${created}, re-graded ${regraded}.`);

  const finalCounts = await prisma.betaInvite.groupBy({
    by: ["wave"],
    where: { campaign: BETA_CAMPAIGN },
    _count: { _all: true },
  });
  console.log("\nBetaInvite rows now in DB:");
  for (const c of finalCounts.sort((a, b) => a.wave.localeCompare(b.wave))) {
    console.log(`  ${c.wave.padEnd(20)} ${c._count._all}`);
  }
}

main()
  .catch((err) => {
    console.error("Prepare failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await new Promise((r) => setTimeout(r, 250));
  });
