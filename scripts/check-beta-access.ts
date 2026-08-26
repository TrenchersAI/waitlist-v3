// Read-only. Reports whether given addresses can actually sign in to the
// beta, straight from the terminal's login_whitelist, plus whether they
// have ever signed in (a row in users).
//
// Use before any send, and any time "granted" on the dashboard needs to be
// reconciled against reality.
//
//   pnpm exec tsx scripts/check-beta-access.ts a@x.com b@y.com

import "dotenv/config";

import { getTrenchersPool } from "../src/lib/trenchers-db";

async function main() {
  const emails = process.argv.slice(2).filter(Boolean);
  const pool = getTrenchersPool();
  if (!pool) {
    console.error("TRENCHERS_DATABASE_URL is not set.");
    process.exit(1);
  }

  // Confirm which database we actually reached before trusting anything it
  // says. A local dev copy and production answer the same query very
  // differently, and only one of them matters.
  const ident = await pool.query<{ db: string; host: string }>(
    `SELECT current_database() AS db,
            coalesce(inet_server_addr()::text, 'local') AS host`,
  );
  const [totals] = (
    await pool.query<{ users: string; wl: string; wl_on: string }>(
      `SELECT (SELECT count(*) FROM users)::text AS users,
              (SELECT count(*) FROM login_whitelist)::text AS wl,
              (SELECT count(*) FROM login_whitelist WHERE enabled)::text AS wl_on`,
    )
  ).rows;

  console.log(`\ndatabase:        ${ident.rows[0].db} @ ${ident.rows[0].host}`);
  console.log(`users:           ${totals.users}`);
  console.log(`login_whitelist: ${totals.wl} rows (${totals.wl_on} enabled)`);

  if (emails.length === 0) {
    console.log("\nNo addresses given. Pass some to check them.");
    return;
  }

  console.log("\nAccess check:");
  for (const email of emails) {
    const v = email.trim().toLowerCase();
    const wl = await pool.query<{ enabled: boolean; note: string | null }>(
      `SELECT enabled, note FROM login_whitelist
        WHERE kind = 'email' AND value = $1`,
      [v],
    );
    const u = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM users WHERE lower(email) = $1`,
      [v],
    );
    const signedIn = u.rows[0].n !== "0";
    if (wl.rowCount === 0) {
      console.log(
        `  ${email.padEnd(30)} NO ACCESS          signed in: ${signedIn}`,
      );
    } else {
      console.log(
        `  ${email.padEnd(30)} ${
          wl.rows[0].enabled ? "ALLOWED " : "DISABLED"
        }           signed in: ${signedIn}   note: ${wl.rows[0].note ?? "-"}`,
      );
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error("check failed:", (err as Error).message);
  process.exit(1);
});
