// Keeps the Falcon promise for wave-1 people who sign up AFTER being mailed.
//
// THE PROBLEM. A tier attaches to a terminal user id. 959 of the 1,364 wave-1
// invitees have never signed up, so there is nothing to attach Falcon to, and
// nothing in the product grants it when they eventually do: a new account
// starts at Bronze. The mail tells them they hold Falcon. This closes that
// gap by polling for new sign-ups among wave-1 and granting them.
//
// THE GRANT IS TWO CALLS, NOT ONE. There is no endpoint that sets a plain
// rank. The only admin tier route is PATCH /admin/users/{id}/plus-tier, which
// sets a PERMANENT floor and makes the badge read "Falcon Plus". The founder
// wants plain "Falcon", so each user is granted and then immediately revoked:
//
//   grant  {"tier":"titan"}  -> rank lifts to titan, badge "Falcon Plus"
//   revoke {"tier":null}     -> floor cleared, badge "Falcon", rank STAYS
//
// The revoke is safe because `grant_outcome` never lowers a rank: a revoke is
// explicitly not a demotion. What it does do is restart the decay clock, so
// these users, like the original 405, hold Falcon until they spend a full
// TIER_DEMOTION_PERIOD_DAYS (30) below the volume bar. That is the accepted
// trade for a badge without the "Plus" suffix.
//
// HONEST LIMITATIONS, read before relying on this.
//
//   * It runs on whoever's laptop starts it, and it needs the ops API, which
//     is only reachable through a kubectl port-forward. If the laptop sleeps
//     or the tunnel drops, sign-ups in that window keep Bronze until the next
//     successful pass. It re-checks from the database every cycle rather than
//     tracking state in memory, so a gap self-heals, but only once it is
//     running again.
//   * It is a STOPGAP. The durable fix is a backend change that grants the
//     tier at sign-up for whitelisted wave-1 addresses. This exists because
//     that does not, and the mail has already gone out.
//   * It only ever RAISES. It never revokes from someone who earned Falcon,
//     and it skips anyone already holding titan, so re-running is free.
//
// Usage:
//   ST_API_BASE_URL=http://127.0.0.1:18080 \
//     pnpm exec tsx scripts/watch-falcon-grants.ts --once
//   ST_API_BASE_URL=http://127.0.0.1:18080 \
//     pnpm exec tsx scripts/watch-falcon-grants.ts --interval 5

import "dotenv/config";

import { getPrismaClient } from "../src/lib/prisma";
import { getTrenchersPool } from "../src/lib/trenchers-db";
import { BETA_CAMPAIGN } from "../src/lib/beta-invite";

const WAVE = "wave-1-completed";
/// Ops router is ConcurrencyLimitLayer::new(5). Stay under it.
const CONCURRENCY = 4;
const DEFAULT_INTERVAL_MIN = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseArgs() {
  const args = process.argv.slice(2);
  const read = (f: string) => {
    const i = args.findIndex((a) => a === f || a.startsWith(`${f}=`));
    if (i < 0) return undefined;
    return args[i].includes("=") ? args[i].split("=").slice(1).join("=") : args[i + 1];
  };
  const iv = read("--interval");
  return {
    once: args.includes("--once"),
    dryRun: args.includes("--dry-run"),
    intervalMin: iv ? Number(iv) : DEFAULT_INTERVAL_MIN,
  };
}

async function call(
  baseUrl: string,
  token: string,
  userId: string,
  tier: "titan" | null,
  attempts = 3,
): Promise<{ ok: boolean; error?: string }> {
  let last = "unknown";
  for (let a = 1; a <= attempts; a++) {
    try {
      const res = await fetch(`${baseUrl}/admin/users/${encodeURIComponent(userId)}/plus-tier`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "X-Ops-Token": token },
        body: JSON.stringify({ tier }),
      });
      if (res.ok) return { ok: true };
      const body = await res.text().catch(() => "");
      last = `HTTP ${res.status} ${body.slice(0, 120)}`;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return { ok: false, error: last };
    } catch (err) {
      last = (err as Error).message;
    }
    if (a < attempts) await sleep(400 * a);
  }
  return { ok: false, error: last };
}

/// One pass. Returns how many people were lifted to Falcon.
async function pass(baseUrl: string, token: string, dryRun: boolean): Promise<number> {
  const prisma = getPrismaClient();
  const pool = getTrenchersPool();
  if (!pool) throw new Error("TRENCHERS_DATABASE_URL is not set.");

  // Everyone in wave 1 we have mailed the Falcon note to. Restricting to
  // falconSentAt is deliberate: it means the watcher only ever makes good on
  // a promise actually made, and cannot silently comp someone who was never
  // told. Phase 1 recipients already hold the tier and are filtered out by
  // the rank check below, so they cost one query, not one API call.
  const invites = await prisma.betaInvite.findMany({
    where: { campaign: BETA_CAMPAIGN, wave: WAVE, falconSentAt: { not: null } },
    select: { id: true, subscriber: { select: { email: true } } },
  });
  if (invites.length === 0) return 0;

  const byEmail = new Map(invites.map((i) => [i.subscriber.email.trim().toLowerCase(), i.id]));
  const emails = [...byEmail.keys()];

  // Who now has an account but is NOT yet on titan. `LEFT JOIN` because a
  // brand-new user has no user_points row at all until they trade; the grant
  // endpoint creates one (`ensure_row_with_conn`), so they are still a valid
  // target and must not be filtered out by an inner join.
  const rows = await pool.query<{ email: string; id: string; rank: string | null }>(
    `SELECT lower(u.email) AS email, u.id::text AS id, up.rank
       FROM users u
       LEFT JOIN user_points up ON up.user_id = u.id
      WHERE u.email IS NOT NULL
        AND lower(u.email) = ANY($1::text[])
        AND (up.rank IS NULL OR up.rank <> 'titan')`,
    [emails],
  );

  if (rows.rows.length === 0) return 0;
  console.log(`  ${new Date().toISOString()}  ${rows.rows.length} to lift`);
  if (dryRun) {
    for (const r of rows.rows.slice(0, 5)) console.log(`    would grant ${r.email} (${r.rank ?? "no points row"})`);
    return 0;
  }

  let lifted = 0;
  const queue = [...rows.rows];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const row = queue.shift();
      if (!row) return;
      // Grant, then immediately revoke, so the badge reads "Falcon" and not
      // "Falcon Plus". If the revoke fails the user is left holding a Plus
      // floor: strictly better than no tier, and the next pass will not
      // retry them (they are titan now), so it is logged loudly.
      const g = await call(baseUrl, token, row.id, "titan");
      if (!g.ok) {
        console.warn(`    grant failed ${row.email}: ${g.error}`);
        continue;
      }
      const r = await call(baseUrl, token, row.id, null);
      if (!r.ok) {
        console.warn(`    REVOKE FAILED ${row.email}: ${r.error} (left as Falcon Plus)`);
      }
      lifted++;
      const inviteId = byEmail.get(row.email);
      if (inviteId) {
        try {
          await prisma.betaInvite.update({
            where: { id: inviteId },
            data: { falconTierGrantedAt: new Date() },
          });
        } catch (err) {
          // The tier is already applied; a missing stamp only costs us
          // reporting accuracy, so never fail the pass over it.
          console.warn(`    stamp failed ${row.email}: ${(err as Error).message}`);
        }
      }
    }
  });
  await Promise.all(workers);
  await pool.end();
  return lifted;
}

async function main() {
  const { once, dryRun, intervalMin } = parseArgs();
  const baseUrl = (process.env.ST_API_BASE_URL ?? "").replace(/\/$/, "");
  const token = process.env.OPS_SERVICE_TOKEN;
  if (!baseUrl || !token) {
    console.error("ST_API_BASE_URL and OPS_SERVICE_TOKEN must be set.");
    process.exit(1);
  }

  console.log(`\nFalcon grant watcher - ${WAVE}`);
  console.log(`API:      ${baseUrl}`);
  console.log(`Mode:     ${dryRun ? "DRY RUN" : "live"}${once ? ", single pass" : `, every ${intervalMin} min`}`);
  console.log(`Action:   grant titan then revoke the floor, so the badge reads "Falcon"\n`);

  let total = 0;
  for (;;) {
    try {
      const n = await pass(baseUrl, token, dryRun);
      total += n;
      if (n > 0) console.log(`  lifted ${n} (running total ${total})`);
    } catch (err) {
      // Never die on one bad pass: the tunnel dropping is the expected
      // failure here, and it comes back.
      console.warn(`  pass failed: ${(err as Error).message}`);
    }
    if (once) break;
    await sleep(intervalMin * 60_000);
  }
  console.log(`\nDone. Lifted ${total}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Watcher crashed:", e);
  process.exit(1);
});
