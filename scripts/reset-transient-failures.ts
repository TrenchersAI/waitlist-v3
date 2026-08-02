// Clears failedAt on recipients whose send failed for a TRANSIENT reason,
// returning them to the pending pool so a later run retries them.
//
// The sender used to stamp failedAt on any batch-level send error, including
// Resend 500s, which permanently excluded those recipients from every future
// run. A server-side hiccup says nothing about the recipient, so it must not
// be terminal. The sender no longer does this, and this script repairs rows
// stamped before the fix.
//
// Deliberately conservative: it never clears a row that was actually sent,
// and it only matches failure reasons known to be transient rather than
// blanket-clearing everything.
//
//   pnpm exec tsx scripts/reset-transient-failures.ts
//   pnpm exec tsx scripts/reset-transient-failures.ts --write

import "dotenv/config";

import { BETA_CAMPAIGN } from "../src/lib/beta-invite";
import { getPrismaClient } from "../src/lib/prisma";

/// Substrings that mark a failure as server-side and retryable.
const TRANSIENT = [
  "Internal server error",
  "unable to process your request",
  "rate limit",
  "timeout",
  "ETIMEDOUT",
  "ECONNRESET",
  "socket hang up",
  "502",
  "503",
  "504",
];

async function main() {
  const write = process.argv.includes("--write");
  const prisma = getPrismaClient();

  const failed = await prisma.betaInvite.findMany({
    where: { campaign: BETA_CAMPAIGN, failedAt: { not: null }, sentAt: null },
    select: { id: true, failReason: true, subscriber: { select: { email: true } } },
  });

  const transient = failed.filter((f) =>
    TRANSIENT.some((t) =>
      (f.failReason ?? "").toLowerCase().includes(t.toLowerCase()),
    ),
  );
  const permanent = failed.filter((f) => !transient.includes(f));

  console.log(`\nRows marked failed and never sent: ${failed.length}`);
  console.log(`  transient (will be reset):        ${transient.length}`);
  console.log(`  other (left alone):               ${permanent.length}`);
  for (const p of permanent.slice(0, 5)) {
    console.log(`    ${p.subscriber.email}: ${p.failReason?.slice(0, 60)}`);
  }

  if (transient.length === 0) {
    console.log("\nNothing to reset.");
    return;
  }

  if (!write) {
    console.log("\nDry-run. First 5 that would be reset:");
    for (const t of transient.slice(0, 5)) console.log(`  ${t.subscriber.email}`);
    console.log("\nRe-run with --write to clear them.");
    return;
  }

  const res = await prisma.betaInvite.updateMany({
    where: { id: { in: transient.map((t) => t.id) } },
    data: { failedAt: null, failReason: null },
  });
  console.log(`\nReset ${res.count} rows. They are pending again and will be`);
  console.log("picked up by the next send run for their wave.");
}

main()
  .catch((err) => {
    console.error("Reset failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await new Promise((r) => setTimeout(r, 250));
  });
