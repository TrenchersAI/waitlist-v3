// Grants beta access without sending anything.
//
// Adds each recipient's email to the terminal's `login_whitelist` through
// the service-token-guarded admin API, then reads the table back to confirm
// the grant actually landed. Sends no email and touches no send state, so it
// is safe to run ahead of a campaign and safe to re-run: the endpoint
// upserts and already-granted rows are skipped.
//
// Note the ordering guarantee this gives up. The bulk sender grants
// just-in-time, one batch at a time, so an abort never leaves people holding
// access they were never told about. Granting everyone up front trades that
// for a simpler operational story: everyone can sign in, and the emails go
// out afterwards at whatever pace we choose.
//
// Required env: ST_API_BASE_URL, OPS_SERVICE_TOKEN, TRENCHERS_DATABASE_URL.
//
//   pnpm exec tsx scripts/grant-beta-access.ts --wave all
//   pnpm exec tsx scripts/grant-beta-access.ts --wave all --grant
//   pnpm exec tsx scripts/grant-beta-access.ts --wave wave-1-completed --grant

import "dotenv/config";

import { BETA_CAMPAIGN, WAVE_ORDER, type InviteWave } from "../src/lib/beta-invite";
import { grantBatch, verifyAccess } from "../src/lib/beta-grant";
import { getPrismaClient } from "../src/lib/prisma";

/// Grant in chunks so progress is visible and a failure is contained to one
/// chunk rather than losing a whole run.
const CHUNK = 100;

function parseArgs() {
  const args = process.argv.slice(2);
  const read = (flag: string) => {
    const i = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
    if (i === -1) return undefined;
    const a = args[i];
    return a.includes("=") ? a.split("=").slice(1).join("=") : args[i + 1];
  };
  const limitRaw = read("--limit");
  return {
    grant: args.includes("--grant"),
    wave: read("--wave"),
    limit: limitRaw ? Number(limitRaw) : Infinity,
  };
}

async function main() {
  const { grant, wave, limit } = parseArgs();
  const prisma = getPrismaClient();

  const isAll = wave === "all";
  if (!isAll && (!wave || !WAVE_ORDER.includes(wave as InviteWave))) {
    console.error(`--wave is required: "all" or one of:\n  ${WAVE_ORDER.join("\n  ")}`);
    process.exit(1);
  }

  const waveFilter = isAll ? { in: WAVE_ORDER } : (wave as InviteWave);

  const pending = await prisma.betaInvite.findMany({
    where: {
      campaign: BETA_CAMPAIGN,
      wave: waveFilter,
      accessGrantedAt: null,
      // Never grant to someone who has opted out or whose address already
      // bounced. They are suppressed, and access they cannot be told about
      // is pointless.
      unsubscribedAt: null,
      bouncedAt: null,
    },
    include: { subscriber: { select: { email: true } } },
    orderBy: [{ wave: "asc" }, { createdAt: "asc" }],
    take: Number.isFinite(limit) ? limit : undefined,
  });

  const already = await prisma.betaInvite.count({
    where: { campaign: BETA_CAMPAIGN, wave: waveFilter, accessGrantedAt: { not: null } },
  });
  const excluded = await prisma.betaInvite.count({
    where: { campaign: BETA_CAMPAIGN, wave: waveFilter, OR: [
      { unsubscribedAt: { not: null } }, { bouncedAt: { not: null } },
    ] },
  });

  console.log(`\nGrant beta access - ${BETA_CAMPAIGN}`);
  console.log(`Mode:            ${grant ? "LIVE GRANT" : "dry-run (use --grant)"}`);
  console.log(`Scope:           ${isAll ? "all waves" : wave}`);
  console.log(`Target API:      ${process.env.ST_API_BASE_URL ?? "(unset)"}`);
  console.log(`Already granted: ${already}`);
  console.log(`Suppressed:      ${excluded} (unsubscribed or bounced, never granted)`);
  console.log(`To grant now:    ${pending.length}`);

  if (pending.length === 0) {
    console.log("\nNothing to grant. Exiting.");
    return;
  }

  if (!grant) {
    console.log("\nDry-run. First 5:");
    for (const p of pending.slice(0, 5)) console.log(`  ${p.subscriber.email}`);
    console.log("\nRe-run with --grant to write to the whitelist.");
    return;
  }

  let granted = 0;
  let failed = 0;
  let verified = 0;

  for (let i = 0; i < pending.length; i += CHUNK) {
    const chunk = pending.slice(i, i + CHUNK);
    const emails = chunk.map((c) => c.subscriber.email);

    const res = await grantBatch(emails, `${BETA_CAMPAIGN} ${chunk[0].wave}`);
    granted += res.granted.length;
    failed += res.failed.length;
    for (const f of res.failed.slice(0, 2)) {
      console.warn(`  ${f.email}: ${f.error}`);
    }

    // Read the whitelist back. A 2xx is not the same fact as a row existing
    // and being enabled, and only the second decides whether someone can
    // sign in. Only stamp the rows that genuinely verified.
    const ok = await verifyAccess(emails);
    if (ok === null) {
      console.error(
        "\nABORT: cannot reach the terminal to verify. Refusing to record " +
          "grants we have not confirmed.",
      );
      process.exit(4);
    }
    const confirmed = chunk.filter((c) =>
      ok.has(c.subscriber.email.trim().toLowerCase()),
    );
    if (confirmed.length > 0) {
      await prisma.betaInvite.updateMany({
        where: { id: { in: confirmed.map((c) => c.id) } },
        data: { accessGrantedAt: new Date() },
      });
      verified += confirmed.length;
    }

    const done = Math.min(i + CHUNK, pending.length);
    process.stdout.write(
      `\r  ${done}/${pending.length}  verified ${verified}  failed ${failed}   `,
    );
  }
  process.stdout.write("\n");

  const finalGranted = await prisma.betaInvite.count({
    where: { campaign: BETA_CAMPAIGN, accessGrantedAt: { not: null } },
  });

  console.log(`\nDone. API accepted ${granted}, verified on whitelist ${verified}, failed ${failed}.`);
  console.log(`Campaign total with access: ${finalGranted}`);
  if (failed > 0) {
    console.log("Re-run to retry failures. The endpoint upserts, so it is safe.");
  }
  console.log("\nNo email was sent. Access only.");
}

main()
  .catch((err) => {
    console.error("Grant failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await new Promise((r) => setTimeout(r, 250));
  });
