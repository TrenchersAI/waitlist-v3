// =============================================================================
// trenchers-db — read-only pg pool for the TRENCHERS production DB (Supabase)
// =============================================================================
//
// The analytics page's Trading Volume / Revenue dashboards read live trading
// data (bot_trades, trades, fee_ledger) from the trenchers backend's Postgres,
// which is a SEPARATE database from this app's own waitlist DB (Prisma). We use
// a plain `pg` pool here rather than a second Prisma client — the trenchers
// tables aren't in our schema, and we only ever run a handful of read-only
// aggregate queries.
//
// Connection string: `TRENCHERS_DATABASE_URL` (the trenchers prod DB URL, from
// the `trenchers-secrets` k8s secret / Supabase). Set it in Vercel + `.env`.
// Distinct from `DATABASE_URL` (this app's own DB). Missing => the endpoints
// return empty series rather than crashing the page.

import { Pool } from "pg";

const globalForTrenchers = globalThis as unknown as {
  trenchersPool: Pool | undefined;
};

export function getTrenchersPool(): Pool | null {
  const connectionString = process.env.TRENCHERS_DATABASE_URL;
  if (!connectionString) return null;
  if (!globalForTrenchers.trenchersPool) {
    // Strip `sslmode` from the URL: recent `pg` treats `sslmode=require` as
    // `verify-full`, which rejects Supabase's self-signed pooler cert chain
    // ("self-signed certificate in certificate chain"). We instead drive TLS
    // via the explicit `ssl` option below — still encrypted, just no chain
    // verification (acceptable for a read-only analytics reader).
    const noSslMode = connectionString.replace(/[?&]sslmode=[^&]*/i, "");
    // A local Postgres (dev, or the throwaway container `scripts/verify-pulse.ts`
    // runs against) is not built with SSL support, and forcing it there fails
    // outright with "The server does not support SSL connections". Remote stays
    // encrypted; only a loopback host opts out.
    const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/i.test(noSslMode);
    const pool = new Pool({
      connectionString: noSslMode,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      // Read-only analytics: a tiny pool is plenty and stays friendly to the
      // Supabase pooler.
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
    });

    // `pg.Pool` emits 'error' when an IDLE pooled client dies — the Supabase
    // pooler drops connections it considers stale, which surfaces as
    // `read ETIMEDOUT`. In Node an 'error' event with no listener is
    // rethrown, so this crashes the whole process rather than the query.
    //
    // That is not theoretical: it killed a live send mid-campaign. The
    // sender sleeps minutes between batches, the connection went idle, the
    // pooler dropped it, and the unhandled event took the process down
    // between batch 11 and 12 with no other symptom.
    //
    // An idle-client failure is recoverable by definition: the pool discards
    // that client and the next query opens a fresh one. Log it and carry on.
    pool.on("error", (err) => {
      console.error("[trenchers-db] idle client error (recovering):", err.message);
    });

    globalForTrenchers.trenchersPool = pool;
  }
  return globalForTrenchers.trenchersPool;
}
