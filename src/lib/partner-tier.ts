// Partner programme: granting and revoking the top-tier permanent floor.
//
// WHAT A PARTNER ACTUALLY IS, mechanically. There is no separate "partner"
// field anywhere. A partner is a user resting on an ADMIN-granted `titan`
// floor (`user_points.plus_tier = titan`, `plus_tier_kind = 'admin'`), and the
// terminal already renders exactly that as the badge "Partner" -- top tier
// only, an owner decision from 2026-09-03. Every lower grant keeps the
// "<Tier> Plus" form, because a comped Diamond and a comped Falcon are not the
// same thing.
//
// So this file introduces NO new concept and NO new column. Doing otherwise
// was the tempting mistake: a `PlusTierKind::Partner` plus a migration plus a
// second badge rule would have produced two mechanisms for one idea, and the
// newer one would have drifted from the shipped one.
//
// WRITES GO THROUGH THE ADMIN API, never straight to the table -- the same
// invariant `beta-grant.ts` follows. That endpoint does things this app cannot:
// it takes a `FOR UPDATE` row lock, applies the monotonic `grant_outcome` so a
// grant can only ever RAISE a rank, writes the floor and the resolved rank in
// ONE transaction, and re-runs the tier job on a settled read. Writing
// `plus_tier` directly would skip all of it and can leave someone being PAID at
// a tier their grant no longer justifies.

/// Falcon on the wire. The API takes rank names, not ordinals.
export const PARTNER_TIER = "titan";

export type PartnerUser = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  tradingWallet: string | null;
  rank: string | null;
  plusTier: string | null;
  plusTierKind: string | null;
  isPartner: boolean;
};

function opsConfig() {
  const baseUrl = (process.env.ST_API_BASE_URL ?? "").replace(/\/$/, "");
  const token = process.env.OPS_SERVICE_TOKEN;
  if (!baseUrl || !token) {
    throw new Error(
      "ST_API_BASE_URL and OPS_SERVICE_TOKEN must be set to manage partners.",
    );
  }
  return { baseUrl, token };
}

/// True when this user's badge currently reads "Partner".
///
/// Mirrors the terminal's own `rankDisplayLabel` rule rather than inventing a
/// looser one: the floor must be `titan`, the kind must not be `claim` (a
/// self-service redemption reads as the plain rank name), and the user must be
/// RESTING on the grant. That last clause is why a partner who trades their way
/// above the floor still counts -- at Falcon there is nowhere above to go, so
/// resting is implied, but the check is written out so it stays true if the
/// ladder ever grows.
export function isPartner(
  rank: string | null | undefined,
  plusTier: string | null | undefined,
  plusTierKind: string | null | undefined,
): boolean {
  if (plusTier !== PARTNER_TIER) return false;
  if (plusTierKind === "claim") return false;
  return rank === PARTNER_TIER;
}

type AdminUserRow = {
  id: string;
  email?: string | null;
  username?: string | null;
  display_name?: string | null;
  trading_wallet?: string | null;
  rank?: string | null;
  plus_tier?: string | null;
  plus_tier_kind?: string | null;
};

/// Look someone up by email, username, display name, or either wallet.
///
/// Deliberately reuses the terminal's existing `GET /admin/users?search=`
/// rather than querying the database here: that endpoint already searches all
/// five fields, and a second implementation would drift from it the first time
/// a column is added.
export async function searchUsers(
  query: string,
  limit = 20,
): Promise<PartnerUser[]> {
  const { baseUrl, token } = opsConfig();
  const url = `${baseUrl}/admin/users?search=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url, { headers: { "X-Ops-Token": token } });
  if (!res.ok) {
    throw new Error(`user search failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { users?: AdminUserRow[] };
  return (body.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? null,
    username: u.username ?? null,
    displayName: u.display_name ?? null,
    tradingWallet: u.trading_wallet ?? null,
    rank: u.rank ?? null,
    plusTier: u.plus_tier ?? null,
    plusTierKind: u.plus_tier_kind ?? null,
    isPartner: isPartner(u.rank, u.plus_tier, u.plus_tier_kind),
  }));
}

/// Grant or revoke the partner floor.
///
/// `null` revokes. The API demands an EXPLICIT null for that -- omitting the
/// key is a 400 there, precisely so an empty body can never clear someone's
/// permanent grant by accident -- so this always sends the key.
///
/// Revoking does NOT demote anyone: `grant_outcome` is monotonic, so the user
/// keeps the rank they hold and simply resumes decaying from it like anybody
/// else. Worth knowing before pressing it, because "revoke" sounds more
/// destructive than it is.
export async function setPartner(
  userId: string,
  grant: boolean,
): Promise<void> {
  const { baseUrl, token } = opsConfig();
  const res = await fetch(`${baseUrl}/admin/users/${userId}/plus-tier`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "X-Ops-Token": token },
    body: JSON.stringify({ tier: grant ? PARTNER_TIER : null }),
  });
  if (!res.ok) {
    throw new Error(`${grant ? "grant" : "revoke"} failed: ${res.status} ${await res.text()}`);
  }
}
