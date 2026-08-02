// Resolves Privy DIDs from st-api "login denied" logs into real email
// addresses, then cross-references them against the beta invite list.
//
// Why this exists. When a login is refused, the backend logs the Privy DID
// but deliberately never logs the email, so the logs alone cannot tell you
// who was turned away. PostHog cannot either: it only identifies users
// AFTER a successful login and never receives an email at all. Privy is the
// only system that holds the mapping, and it is authoritative because it is
// the identity provider itself.
//
// The interesting cases are the DIDs the backend recorded as
// `has_email: false`. Those are people who signed in with Apple, X, or a
// bare wallet, which the backend cannot resolve to an email
// (crates/st-signing/src/privy.rs only reads `email` and `google_oauth`
// linked accounts). Privy usually DOES hold an address for them, so this
// script can recover contactable people the backend had no way to identify.
//
// Input:  /tmp/denied-dids.txt, lines of `did,has_email`
// Env:    PRIVY_APP_ID, PRIVY_APP_SECRET
//
//   pnpm exec tsx scripts/resolve-denied-logins.ts

import "dotenv/config";
import { readFileSync } from "node:fs";

import { BETA_CAMPAIGN } from "../src/lib/beta-invite";
import { getPrismaClient } from "../src/lib/prisma";
import { getTrenchersPool } from "../src/lib/trenchers-db";

type LinkedAccount = {
  type?: string;
  address?: string;
  email?: string;
  username?: string;
};

type PrivyUser = {
  id?: string;
  created_at?: number;
  linked_accounts?: LinkedAccount[];
};

/// Pulls every address Privy knows for this identity, not just the ones the
/// backend is willing to accept. That difference is the point of the script.
function emailsFrom(user: PrivyUser): { primary: string | null; all: string[] } {
  const all: string[] = [];
  let primary: string | null = null;
  for (const a of user.linked_accounts ?? []) {
    const candidates = [a.email, a.address].filter(
      (v): v is string => typeof v === "string" && v.includes("@"),
    );
    for (const c of candidates) {
      const v = c.trim().toLowerCase();
      if (!all.includes(v)) all.push(v);
      // These two are the only types the backend resolves, so an address
      // found here would have satisfied the gate.
      if (!primary && (a.type === "email" || a.type === "google_oauth")) {
        primary = v;
      }
    }
  }
  return { primary, all };
}

async function fetchPrivyUser(
  did: string,
  appId: string,
  secret: string,
): Promise<PrivyUser | null> {
  const auth = Buffer.from(`${appId}:${secret}`).toString("base64");
  const res = await fetch(`https://auth.privy.io/api/v1/users/${did}`, {
    headers: {
      Authorization: `Basic ${auth}`,
      "privy-app-id": appId,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    console.warn(`  ${did}: HTTP ${res.status}`);
    return null;
  }
  return (await res.json()) as PrivyUser;
}

async function main() {
  const appId = process.env.PRIVY_APP_ID;
  const secret = process.env.PRIVY_APP_SECRET;
  if (!appId || !secret) {
    console.error("PRIVY_APP_ID and PRIVY_APP_SECRET must be set.");
    process.exit(1);
  }

  const lines = readFileSync("/tmp/denied-dids.txt", "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const prisma = getPrismaClient();
  const pool = getTrenchersPool();

  type Row = {
    did: string;
    backendSawEmail: boolean;
    email: string | null;
    allEmails: string[];
    types: string[];
  };
  const rows: Row[] = [];

  console.log(`\nResolving ${lines.length} denied Privy identities...\n`);
  for (const line of lines) {
    const [did, hasEmail] = line.split(",");
    const user = await fetchPrivyUser(did, appId, secret);
    if (!user) continue;
    const { primary, all } = emailsFrom(user);
    rows.push({
      did,
      backendSawEmail: hasEmail === "true",
      email: primary ?? all[0] ?? null,
      allEmails: all,
      types: (user.linked_accounts ?? []).map((a) => a.type ?? "?"),
    });
    await new Promise((r) => setTimeout(r, 120));
  }

  // Which of these are ours, and can they sign in now?
  const emails = rows.map((r) => r.email).filter((e): e is string => !!e);
  const invited = await prisma.betaInvite.findMany({
    where: {
      campaign: BETA_CAMPAIGN,
      subscriber: { email: { in: emails, mode: "insensitive" } },
    },
    select: { sentAt: true, subscriber: { select: { email: true } } },
  });
  const invitedSet = new Set(
    invited.map((i) => i.subscriber.email.trim().toLowerCase()),
  );

  // The terminal cross-reference is enrichment, not the result. Resolving
  // the identities is the expensive, rate-limited part and it has already
  // happened by this point, so a slow pooler must not throw that away.
  let whitelisted = new Set<string>();
  let signedIn = new Set<string>();
  let enriched = false;
  if (pool && emails.length > 0) {
    for (let attempt = 1; attempt <= 3 && !enriched; attempt++) {
      try {
        const [wl, us] = await Promise.all([
          pool.query<{ value: string }>(
            `SELECT value FROM login_whitelist
              WHERE enabled = TRUE AND kind='email' AND value = ANY($1::text[])`,
            [emails],
          ),
          pool.query<{ email: string }>(
            `SELECT lower(email) AS email FROM users
              WHERE email IS NOT NULL AND lower(email) = ANY($1::text[])`,
            [emails],
          ),
        ]);
        whitelisted = new Set(wl.rows.map((r) => r.value));
        signedIn = new Set(us.rows.map((r) => r.email));
        enriched = true;
      } catch (err) {
        console.warn(
          `  terminal lookup attempt ${attempt} failed: ${(err as Error).message}`,
        );
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    if (!enriched) {
      console.warn(
        "\n  Terminal unreachable. Listing identities without whitelist or\n" +
          "  sign-in status; the emails themselves are still correct.\n",
      );
    }
  }

  console.log("=".repeat(100));
  for (const r of rows) {
    const e = r.email ?? "(no email in Privy)";
    const tags = [
      r.backendSawEmail ? "" : "BACKEND-BLIND",
      invitedSet.has(e) ? "INVITED" : "not-invited",
      whitelisted.has(e) ? "whitelisted" : "NOT-whitelisted",
      signedIn.has(e) ? "signed-in-since" : "still-out",
    ].filter(Boolean);
    console.log(`${e.padEnd(38)} ${tags.join("  ")}`);
    console.log(`   ${r.did}  linked=[${r.types.join(", ")}]`);
  }
  console.log("=".repeat(100));

  const contactable = rows
    .map((r) => r.email)
    .filter((e): e is string => !!e && !signedIn.has(e));
  console.log(`\nresolved identities        : ${rows.length}`);
  console.log(`with an email in Privy     : ${rows.filter((r) => r.email).length}`);
  console.log(`backend could NOT see email: ${rows.filter((r) => !r.backendSawEmail).length}`);
  console.log(`on our invite list         : ${rows.filter((r) => r.email && invitedSet.has(r.email)).length}`);
  console.log(`signed in since            : ${rows.filter((r) => r.email && signedIn.has(r.email)).length}`);
  console.log(`STILL LOCKED OUT           : ${new Set(contactable).size}`);

  if (pool) await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
