// =============================================================================
// ops-db — read-only pg pool for the OPS console DB (trenchers-ops / Prisma)
// =============================================================================
//
// The analytics page's "Paper SOL given" dashboard reads the ops console's
// `PaperSolRequest` table — the ONLY per-event record of paper-SOL top-ups.
// The trenchers backend keeps just a running total per user
// (`users.paper_credit_lamports`), with no date and no per-grant row, so the
// "how much did we hand out, when, and to whom" question can only be answered
// from the ops side, where every "Request sol" ask lands and every approval is
// recorded (`creditedLamports`, `decidedAt`, `decidedByEmail`, `autoApproved`).
//
// Third database for this app: distinct from `DATABASE_URL` (the waitlist's
// own Prisma DB) and `TRENCHERS_DATABASE_URL` (the trading backend). Plain
// `pg` pool, same shape and the same TLS caveats as `trenchers-db.ts` — a
// handful of read-only aggregates, never a write.
//
// Connection string: `OPS_DATABASE_URL` (the ops console's `DATABASE_URL`).
// Set it in Vercel + `.env`. Missing => the endpoint returns an empty series
// rather than crashing the page.

import { Pool } from "pg";

const globalForOps = globalThis as unknown as {
  opsPool: Pool | undefined;
};

export function getOpsPool(): Pool | null {
  const connectionString = process.env.OPS_DATABASE_URL;
  if (!connectionString) return null;
  if (!globalForOps.opsPool) {
    // Same `sslmode` handling as `trenchers-db.ts`: recent `pg` treats
    // `sslmode=require` as `verify-full`, which rejects a hosted pooler's
    // self-signed chain. Drive TLS via the explicit `ssl` option instead;
    // loopback (local dev) opts out because a local Postgres has no SSL.
    const noSslMode = connectionString.replace(/[?&]sslmode=[^&]*/i, "");
    const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/i.test(noSslMode);
    const pool = new Pool({
      connectionString: noSslMode,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      // Read-only analytics: a tiny pool is plenty.
      max: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
    });
    // An idle pooled client dying must not take the process down (see the
    // incident note in `trenchers-db.ts`). Log and let the pool recover.
    pool.on("error", (err) => {
      console.error("[ops-db] idle client error (recovering):", err.message);
    });
    globalForOps.opsPool = pool;
  }
  return globalForOps.opsPool;
}
