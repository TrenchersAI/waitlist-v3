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
    globalForTrenchers.trenchersPool = new Pool({
      connectionString: noSslMode,
      ssl: { rejectUnauthorized: false },
      // Read-only analytics: a tiny pool is plenty and stays friendly to the
      // Supabase pooler.
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForTrenchers.trenchersPool;
}
