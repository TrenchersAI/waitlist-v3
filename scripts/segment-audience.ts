// Read-only. Grades the whole waitlist into send waves and prints the
// tally plus a domain breakdown per wave. Run this before any send to see
// exactly who would be mailed at each stage.
//
//   pnpm exec tsx scripts/segment-audience.ts

import "dotenv/config";

import { gradeAudience, tallyWaves } from "../src/lib/beta-audience";
import { WAVE_LABELS, WAVE_ORDER, emailDomain } from "../src/lib/beta-invite";

async function main() {
  const graded = await gradeAudience();
  const tally = tallyWaves(graded);

  console.log("\n=== Beta invite - audience segmentation ===\n");
  console.log(`Total subscriber rows: ${graded.length}\n`);

  let cumulative = 0;
  for (const wave of WAVE_ORDER) {
    cumulative += tally[wave];
    console.log(
      `${wave.padEnd(20)} ${String(tally[wave]).padStart(6)}   ` +
        `cumulative ${String(cumulative).padStart(6)}   ${WAVE_LABELS[wave]}`,
    );
  }
  console.log(
    `${"excluded".padEnd(20)} ${String(tally.excluded).padStart(6)}   ` +
      `${" ".repeat(17)}   ${WAVE_LABELS.excluded}`,
  );
  console.log(`\nMailable total (waves 1-5): ${cumulative}`);
  console.log(
    `Recommended first send (waves 1-2): ${
      tally["wave-1-completed"] + tally["wave-2-engaged"]
    }`,
  );

  // Gmail share per wave. Gmail reputation is driven by gmail.com
  // recipients specifically, so a wave that is overwhelmingly Gmail
  // deserves slower pacing than one with a spread of providers.
  console.log("\n=== Gmail concentration per wave ===\n");
  for (const wave of WAVE_ORDER) {
    const inWave = graded.filter((g) => g.wave === wave);
    if (inWave.length === 0) continue;
    const gmail = inWave.filter((g) => emailDomain(g.email) === "gmail.com").length;
    const pct = ((gmail / inWave.length) * 100).toFixed(1);
    console.log(
      `${wave.padEnd(20)} ${String(gmail).padStart(6)} / ${String(
        inWave.length,
      ).padStart(6)}  ${pct}% gmail`,
    );
  }

  // Top domains inside the two waves we would actually send first.
  console.log("\n=== Top domains, waves 1-2 (the safe first send) ===\n");
  const firstSend = graded.filter(
    (g) => g.wave === "wave-1-completed" || g.wave === "wave-2-engaged",
  );
  const byDomain = new Map<string, number>();
  for (const g of firstSend) {
    const d = emailDomain(g.email);
    byDomain.set(d, (byDomain.get(d) ?? 0) + 1);
  }
  const sorted = [...byDomain.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  for (const [domain, n] of sorted) {
    console.log(`  ${domain.padEnd(28)} ${String(n).padStart(5)}`);
  }
  console.log(`\n  distinct domains in waves 1-2: ${byDomain.size}`);
}

main()
  .catch((err) => {
    console.error("Segmentation failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await new Promise((r) => setTimeout(r, 250));
  });
