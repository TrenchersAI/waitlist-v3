// Grants beta.trenchers.ai access to invited waitlist users by adding their
// email to the terminal backend's `login_whitelist`.
//
// IMPORTANT ORDERING: run this BEFORE send-beta-invites.ts for the same
// wave. The terminal is default-deny (LOGIN_WHITELIST_ENFORCED is unset in
// production, and the Rust side treats unset as enforced), so a recipient
// who clicks through before their row exists gets a 403 and the frontend's
// "your spot is reserved" waitlist card - i.e. an email that says "you're
// in" leading to a screen that says "you're not". The whitelist is read
// from Postgres on every request with no caching, so a grant takes effect
// immediately and there is no reason to cut it fine.
//
// We go through the service-token-guarded admin API rather than writing to
// the table directly. The migration that created the table is explicit that
// "ops never touches this table directly", and the API's POST is an
// idempotent upsert (ON CONFLICT (kind, value) DO UPDATE SET enabled=TRUE),
// which is exactly the semantics a resumable bulk grant wants.
//
// Required env:
//   ST_API_BASE_URL   e.g. https://api.trenchers.ai
//   OPS_SERVICE_TOKEN the X-Ops-Token value for the target environment
//
//   pnpm exec tsx scripts/grant-beta-access.ts --wave wave-1-completed
//   pnpm exec tsx scripts/grant-beta-access.ts --wave wave-1-completed --grant

import "dotenv/config";

import { BETA_CAMPAIGN, WAVE_ORDER, type InviteWave } from "../src/lib/beta-invite";
import { getPrismaClient } from "../src/lib/prisma";

/// The ops router is wrapped in ConcurrencyLimitLayer::new(5) on the
/// backend, so anything above 5 in flight just queues (or sheds). Stay at
/// or under it.
const CONCURRENCY = 4;

function parseArgs() {
  const args = process.argv.slice(2);
  const grant = args.includes("--grant");
  const readValue = (flag: string) => {
    const idx = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
    if (idx === -1) return undefined;
    const a = args[idx];
    return a.includes("=") ? a.split("=").slice(1).join("=") : args[idx + 1];
  };
  const wave = readValue("--wave") as InviteWave | undefined;
  const limitRaw = readValue("--limit");
  return { grant, wave, limit: limitRaw ? Number(limitRaw) : Infinity };
}

type GrantOutcome = { id: string; email: string; ok: boolean; error?: string };

async function grantOne(params: {
  baseUrl: string;
  token: string;
  email: string;
  wave: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${params.baseUrl}/admin/whitelist`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Ops-Token": params.token,
    },
    body: JSON.stringify({
      kind: "email",
      // The repo layer lower-cases and trims before both insert and
      // lookup, but normalising here too keeps our local record identical
      // to what the backend stores.
      value: params.email.trim().toLowerCase(),
      note: `${BETA_CAMPAIGN} ${params.wave}`,
      added_by: "waitlist-v3/grant-beta-access",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `HTTP ${res.status} ${body.slice(0, 160)}` };
  }
  return { ok: true };
}

async function main() {
  const { grant, wave, limit } = parseArgs();
  const prisma = getPrismaClient();

  if (!wave || !WAVE_ORDER.includes(wave)) {
    console.error(
      `--wave is required and must be one of:\n  ${WAVE_ORDER.join("\n  ")}`,
    );
    process.exit(1);
  }
  // Bound after the guard so the narrowing survives into the worker
  // closures below.
  const targetWave: InviteWave = wave;

  const baseUrl = (process.env.ST_API_BASE_URL ?? "").replace(/\/$/, "");
  const token = process.env.OPS_SERVICE_TOKEN;
  if (grant && (!baseUrl || !token)) {
    console.error(
      "ST_API_BASE_URL and OPS_SERVICE_TOKEN must be set to grant access.",
    );
    process.exit(1);
  }

  const pending = await prisma.betaInvite.findMany({
    where: {
      campaign: BETA_CAMPAIGN,
      wave: targetWave,
      accessGrantedAt: null,
      unsubscribedAt: null,
    },
    include: { subscriber: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
    take: Number.isFinite(limit) ? limit : undefined,
  });

  const alreadyGranted = await prisma.betaInvite.count({
    where: { campaign: BETA_CAMPAIGN, wave: targetWave, accessGrantedAt: { not: null } },
  });

  console.log(`\nGrant beta access - ${BETA_CAMPAIGN} - wave ${targetWave}`);
  console.log(`Mode:            ${grant ? "LIVE GRANT" : "dry-run (use --grant)"}`);
  console.log(`Target API:      ${baseUrl || "(unset)"}`);
  console.log(`Already granted: ${alreadyGranted}`);
  console.log(`To grant now:    ${pending.length}`);

  if (pending.length === 0) {
    console.log("\nNothing to grant. Exiting.");
    return;
  }

  if (!grant) {
    console.log("\nDry-run. First 5:");
    for (const p of pending.slice(0, 5)) console.log(`  ${p.subscriber.email}`);
    console.log("\nRun with --grant to write to the whitelist.");
    return;
  }

  let done = 0;
  let failed = 0;
  const queue = [...pending];

  // Simple worker pool. Each worker pulls the next row, so a slow request
  // does not stall the others, and we never exceed CONCURRENCY in flight.
  async function worker(): Promise<GrantOutcome[]> {
    const results: GrantOutcome[] = [];
    for (;;) {
      const row = queue.shift();
      if (!row) return results;
      const email = row.subscriber.email;
      try {
        const res = await grantOne({
          baseUrl,
          token: token!,
          email,
          wave: targetWave,
        });
        if (res.ok) {
          await prisma.betaInvite.update({
            where: { id: row.id },
            data: { accessGrantedAt: new Date() },
          });
          done++;
        } else {
          failed++;
          console.warn(`  ${email}: ${res.error}`);
        }
        results.push({ id: row.id, email, ok: res.ok, error: res.error });
      } catch (err) {
        failed++;
        console.warn(`  ${email}: threw - ${(err as Error).message}`);
        results.push({ id: row.id, email, ok: false });
      }
      if ((done + failed) % 100 === 0) {
        process.stdout.write(`\r  granted ${done}, failed ${failed}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  process.stdout.write("\n");

  console.log(`\nDone. Granted ${done}, failed ${failed}.`);
  if (failed > 0) {
    console.log(
      "Re-run to retry failures - the endpoint upserts, so retrying is safe.",
    );
  }
}

main()
  .catch((err) => {
    console.error("Grant failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await new Promise((r) => setTimeout(r, 250));
  });
