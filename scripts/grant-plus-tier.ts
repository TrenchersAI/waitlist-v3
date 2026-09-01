// Bulk-grant a Plus tier to a beta wave.
//
// The sibling of grant-beta-access.ts. That script writes the login
// allow-list; this one writes the reward tier, through
// `PATCH /admin/users/{id}/plus-tier` on the same ops-token stack.
//
// WHY PLUS AND NOT A PLAIN RANK. There is no endpoint that sets a plain,
// non-permanent rank: `user_points.rank` is owned by the volume-derived award
// path and by tier_job. Setting it by hand would not survive either, because
// TIER_DEMOTION_PERIOD_DAYS is 30 and a user below their floor steps down one
// tier per period all the way to Bronze. A Plus grant is a permanent floor, so
// it is the only mechanism that makes a gifted tier stick.
//
// The grant is MONOTONIC server-side: `grant_outcome` may only raise a rank,
// never lower one, and it starts no demotion clock. Re-running is therefore
// safe, and a user who has already earned Titan is left exactly as they are.
//
// A user with no `user_points` row is fine: the endpoint calls
// `ensure_row_with_conn` and creates a Bronze row first, which is precisely
// the never-traded population this is meant to comp. A user with no `users`
// row at all is a genuine 404 and is reported as skipped, not failed.
//
// Usage:
//   pnpm exec tsx scripts/grant-plus-tier.ts --wave wave-1-completed --tier titan
//   pnpm exec tsx scripts/grant-plus-tier.ts --wave wave-1-completed --tier titan --grant
//
// Requires ST_API_BASE_URL and OPS_SERVICE_TOKEN, plus TRENCHERS_DATABASE_URL
// to resolve emails to user ids.

import "dotenv/config";

import { getPrismaClient } from "../src/lib/prisma";
import { getTrenchersPool } from "../src/lib/trenchers-db";
import { BETA_CAMPAIGN, WAVE_ORDER, type InviteWave } from "../src/lib/beta-invite";

/// The ops router is wrapped in ConcurrencyLimitLayer::new(5) on the backend.
/// Stay under it or requests queue and shed. Same constant, same reason, as
/// beta-grant.ts.
const GRANT_CONCURRENCY = 4;

const VALID_TIERS = ["bronze", "silver", "gold", "platinum", "diamond", "titan"] as const;
type Tier = (typeof VALID_TIERS)[number];

function parseArgs() {
  const args = process.argv.slice(2);
  const read = (flag: string) => {
    const i = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
    if (i < 0) return undefined;
    const a = args[i];
    return a.includes("=") ? a.split("=").slice(1).join("=") : args[i + 1];
  };
  const limitRaw = read("--limit");
  return {
    grant: args.includes("--grant"),
    // Revoke clears the permanent floor by sending an explicit null. It does
    // NOT demote: `grant_outcome` leaves the rank exactly where it stands and
    // the normal decay machinery takes over from there, so a revoked user
    // keeps the tier until their volume fails to hold it for a full
    // TIER_DEMOTION_PERIOD_DAYS (30).
    revoke: args.includes("--revoke"),
    wave: read("--wave") as InviteWave | undefined,
    tier: (read("--tier") ?? "titan") as Tier,
    limit: limitRaw ? Number(limitRaw) : Infinity,
  };
}

type GrantRow = { email: string; userId: string };

/// Retries transient failures. A 4xx is a real rejection and is not retried:
/// the endpoint 400s a malformed tier and 404s an unknown user, and neither
/// improves by being asked again. Mirrors grantOne in beta-grant.ts.
async function grantOne(
  baseUrl: string,
  token: string,
  row: GrantRow,
  tier: Tier | null,
  attempts = 3,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  let lastError = "unknown";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(
        `${baseUrl}/admin/users/${encodeURIComponent(row.userId)}/plus-tier`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json", "X-Ops-Token": token },
          // The `tier` key MUST be present. An absent key is a 400 by design,
          // because an explicit null on this route REVOKES a permanent grant
          // and an empty body must never be able to do that by accident.
          // `JSON.stringify({tier: null})` emits the key, which is exactly the
          // deliberate-revoke shape the handler wants.
          body: JSON.stringify({ tier }),
        },
      );
      if (res.ok) return { ok: true };
      const body = await res.text().catch(() => "");
      lastError = `HTTP ${res.status} ${body.slice(0, 140)}`;
      // A 404 means the account vanished between the id lookup and now. That
      // is a skip, not a failure: there is nothing to grant and nothing to fix.
      if (res.status === 404) return { ok: false, skipped: true, error: lastError };
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return { ok: false, error: lastError };
      }
    } catch (err) {
      lastError = (err as Error).message;
    }
    if (attempt < attempts) {
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  return { ok: false, error: lastError };
}

async function main() {
  const { grant, revoke, wave, tier, limit } = parseArgs();

  if (!wave || !WAVE_ORDER.includes(wave)) {
    console.error(`--wave is required, one of:\n  ${WAVE_ORDER.join("\n  ")}`);
    process.exit(1);
  }
  if (!VALID_TIERS.includes(tier)) {
    console.error(`--tier must be one of: ${VALID_TIERS.join(", ")}`);
    process.exit(1);
  }
  const baseUrl = (process.env.ST_API_BASE_URL ?? "").replace(/\/$/, "");
  const token = process.env.OPS_SERVICE_TOKEN;
  if (!baseUrl || !token) {
    console.error("ST_API_BASE_URL and OPS_SERVICE_TOKEN must be set.");
    process.exit(1);
  }

  // PREFLIGHT. Prove the API answers before touching anything else.
  //
  // Without this the script discovers an unreachable endpoint one failed
  // request at a time: a stale ST_API_BASE_URL pointing at a dead port burned
  // 200 attempts before anyone noticed, because the DB half of the dry-run
  // succeeds and says nothing about the API. Fail in one request instead.
  try {
    const res = await fetch(`${baseUrl}/admin/users?limit=1`, {
      headers: { "X-Ops-Token": token },
    });
    if (!res.ok) {
      console.error(
        `\nPREFLIGHT FAILED: ${baseUrl} answered HTTP ${res.status}.` +
          (res.status === 401 || res.status === 403
            ? " OPS_SERVICE_TOKEN is wrong or not accepted here."
            : ""),
      );
      process.exit(1);
    }
  } catch (err) {
    console.error(
      `\nPREFLIGHT FAILED: cannot reach ${baseUrl} (${(err as Error).message}).\n` +
        "Check ST_API_BASE_URL. The value in .env points at a local port-forward\n" +
        "that is not always running; the runbook passes https://api.trenchers.ai\n" +
        "inline instead.",
    );
    process.exit(1);
  }

  const prisma = getPrismaClient();
  // Only people we actually mailed. Granting a tier to someone who never got
  // the invite would be a silent entitlement with no story attached to it.
  const invites = await prisma.betaInvite.findMany({
    where: { campaign: BETA_CAMPAIGN, wave, sentAt: { not: null } },
    select: { subscriber: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
  });
  const emails = invites.map((r) => r.subscriber.email.trim().toLowerCase());

  const pool = getTrenchersPool();
  if (!pool) {
    console.error("TRENCHERS_DATABASE_URL must be set to resolve emails to user ids.");
    process.exit(1);
  }

  // Same shape as the analytics cross-reference: lower(email) on both sides,
  // because the platform stores addresses as the user typed them.
  //
  // REVOKE narrows to rows that actually HOLD a grant. Two reasons: it makes
  // the run idempotent, and more importantly it can only ever clear grants
  // belonging to THIS wave. A grant issued to someone outside the wave (there
  // are pre-existing ones) is never in this set and cannot be collaterally
  // cleared by a wave-scoped revoke.
  const found = await pool.query<{ email: string; id: string }>(
    revoke
      ? `SELECT lower(u.email) AS email, u.id::text AS id
           FROM users u
           JOIN user_points up ON up.user_id = u.id
          WHERE u.email IS NOT NULL
            AND lower(u.email) = ANY($1::text[])
            AND up.plus_tier IS NOT NULL`
      : `SELECT lower(email) AS email, id::text AS id
           FROM users
          WHERE email IS NOT NULL AND lower(email) = ANY($1::text[])`,
    [emails],
  );
  const byEmail = new Map(found.rows.map((r) => [r.email, r.id]));
  const targets: GrantRow[] = emails
    .filter((e) => byEmail.has(e))
    .map((e) => ({ email: e, userId: byEmail.get(e)! }))
    .slice(0, Number.isFinite(limit) ? limit : undefined);
  const noAccount = emails.length - byEmail.size;

  console.log(`\n${revoke ? "REVOKE" : "Grant"} Plus tier - ${BETA_CAMPAIGN}`);
  console.log(`Mode:          ${grant ? (revoke ? "LIVE REVOKE" : "LIVE GRANT") : "dry-run (use --grant)"}`);
  console.log(`Wave:          ${wave}`);
  if (revoke) {
    console.log(`Action:        clear the permanent floor (tier: null)`);
    console.log(`               rank is NOT lowered; normal 30-day decay resumes`);
  } else {
    console.log(`Tier:          ${tier}${tier === "titan" ? "  (renders as Falcon Plus)" : ""}`);
  }
  console.log(`Target API:    ${baseUrl}`);
  console.log(`Mailed:        ${emails.length}`);
  if (!revoke) {
    console.log(`No account:    ${noAccount}  (cannot be granted, nothing to attach to)`);
  }
  console.log(`To ${revoke ? "revoke" : "grant"} now: ${targets.length}`);

  if (targets.length === 0) {
    console.log("\nNothing to grant. Exiting.");
    await pool.end();
    await prisma.$disconnect();
    return;
  }

  if (!grant) {
    console.log("\nDry-run. First 5:");
    for (const t of targets.slice(0, 5)) console.log(`  ${t.email}  ${t.userId}`);
    console.log(`\nRe-run with --grant to ${revoke ? "clear the floor" : "write the tier"}.`);
    await pool.end();
    await prisma.$disconnect();
    return;
  }

  let granted = 0;
  let skipped = 0;
  let failed = 0;
  const failures: { email: string; error: string }[] = [];

  const queue = [...targets];
  const workers = Array.from({ length: GRANT_CONCURRENCY }, async () => {
    for (;;) {
      const row = queue.shift();
      if (!row) return;
      const res = await grantOne(baseUrl, token, row, revoke ? null : tier);
      if (res.ok) granted++;
      else if (res.skipped) skipped++;
      else {
        failed++;
        failures.push({ email: row.email, error: res.error ?? "unknown" });
      }
      const done = granted + skipped + failed;
      if (done % 50 === 0 || done === targets.length) {
        console.log(`  ${done}/${targets.length}: granted ${granted}, skipped ${skipped}, failed ${failed}`);
      }
    }
  });
  await Promise.all(workers);

  console.log(`\nDone. ${revoke ? "Revoked" : "Granted"} ${granted}, skipped ${skipped} (no such user), failed ${failed}.`);
  if (failures.length > 0) {
    console.log("\nFirst failures:");
    for (const f of failures.slice(0, 10)) console.log(`  ${f.email}: ${f.error}`);
    console.log("\nRe-run to retry. The grant is monotonic, so it is safe.");
  }

  await pool.end();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(`\nFATAL: ${(err as Error).message}`);
  process.exit(1);
});
