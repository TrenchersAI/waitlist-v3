// Granting beta access, shared by the bulk sender and the standalone grant
// script.
//
// Access is provisioned just-in-time, one batch at a time, immediately
// before that batch is mailed. The alternative (grant the whole wave up
// front) means an aborted send leaves thousands of people holding access
// they were never told about, and widens the blast radius of a mistake
// from one batch to the entire list.
//
// Writes go through the service-token-guarded admin API rather than
// straight to the table, matching the invariant stated in the migration
// that created `login_whitelist`: ops never touches it directly. The
// endpoint upserts, so retrying a partially failed batch is safe.

import { getTrenchersPool } from "./trenchers-db";

/// The ops router is wrapped in ConcurrencyLimitLayer::new(5) on the
/// backend. Stay under it or requests queue and shed.
const GRANT_CONCURRENCY = 4;

export type GrantResult = {
  granted: string[];
  failed: { email: string; error: string }[];
};

function opsConfig() {
  const baseUrl = (process.env.ST_API_BASE_URL ?? "").replace(/\/$/, "");
  const token = process.env.OPS_SERVICE_TOKEN;
  if (!baseUrl || !token) {
    throw new Error(
      "ST_API_BASE_URL and OPS_SERVICE_TOKEN must be set to grant access.",
    );
  }
  return { baseUrl, token };
}

/// Retries transient failures. Over a multi-hour run the connection to the
/// API is the least reliable link in the chain (it runs through a
/// port-forward), and a dropped connection should cost us a retry rather
/// than silently shrinking the batch. Safe to retry because the endpoint
/// upserts. A 4xx is a real rejection and is not retried.
async function grantOne(
  baseUrl: string,
  token: string,
  email: string,
  note: string,
  attempts = 3,
): Promise<{ ok: boolean; error?: string }> {
  let lastError = "unknown";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/admin/whitelist`, {
        method: "POST",
        headers: { "content-type": "application/json", "X-Ops-Token": token },
        body: JSON.stringify({
          kind: "email",
          // The repo layer lower-cases and trims on both insert and lookup.
          // Normalising here too keeps our record identical to what is stored.
          value: email.trim().toLowerCase(),
          note,
          added_by: "waitlist-v3/beta-invite",
        }),
      });
      if (res.ok) return { ok: true };
      const body = await res.text().catch(() => "");
      lastError = `HTTP ${res.status} ${body.slice(0, 120)}`;
      // Client errors are decisions, not blips.
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

/// Grants a batch. Returns which addresses succeeded so the caller can mail
/// exactly those and no others.
export async function grantBatch(
  emails: string[],
  note: string,
): Promise<GrantResult> {
  const { baseUrl, token } = opsConfig();
  const queue = [...emails];
  const granted: string[] = [];
  const failed: { email: string; error: string }[] = [];

  async function worker() {
    for (;;) {
      const email = queue.shift();
      if (!email) return;
      try {
        const r = await grantOne(baseUrl, token, email, note);
        if (r.ok) granted.push(email);
        else failed.push({ email, error: r.error ?? "unknown" });
      } catch (err) {
        failed.push({ email, error: (err as Error).message });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(GRANT_CONCURRENCY, emails.length) }, () =>
      worker(),
    ),
  );
  return { granted, failed };
}

/// Reads `login_whitelist` back to confirm the grant actually took effect.
///
/// A 2xx from the admin API is not the same fact as a row existing and
/// being enabled, and only the second one decides whether a person can sign
/// in. Since the email we are about to send asserts their access is open,
/// this check is what makes that assertion true rather than hopeful.
///
/// Returns null when the terminal is unreachable, which callers must treat
/// as a refusal rather than a pass.
export async function verifyAccess(
  emails: string[],
  attempts = 3,
): Promise<Set<string> | null> {
  const pool = getTrenchersPool();
  if (!pool) return null;
  const values = emails.map((e) => e.trim().toLowerCase());

  // Retry transient connection failures. A send sleeps minutes between
  // batches, so the first query after a gap can land on a connection the
  // pooler has already dropped and fail with ETIMEDOUT. Without this, one
  // stale connection ends a multi-hour run.
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await pool.query<{ value: string }>(
        `SELECT value FROM login_whitelist
          WHERE enabled = TRUE AND kind = 'email' AND value = ANY($1::text[])`,
        [values],
      );
      return new Set(res.rows.map((r) => r.value));
    } catch (err) {
      lastError = err as Error;
      if (attempt < attempts) await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  // Exhausted retries. Return null rather than throwing: null means "could
  // not verify", and the caller already treats that as a refusal to send
  // rather than a pass, which is the safe reading.
  console.error(`[beta-grant] verifyAccess failed: ${lastError?.message}`);
  return null;
}
