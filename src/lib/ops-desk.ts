// ops-desk — where a platform user's Trench Desk profile lives.
//
// The desk (trenchers-ops) keys profiles by the PLATFORM user id, the same id
// the analytics queries return as `userId`, so a link needs nothing but that.
// The desk syncs an unknown-but-real user on first open, so a user who has
// never been touched by the desk still resolves.

const DEFAULT_OPS_ORIGIN = "https://ops.trenchers.ai";

/** Origin of the ops console; `NEXT_PUBLIC_OPS_ORIGIN` overrides (previews). */
export function opsOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_OPS_ORIGIN?.trim();
  return (fromEnv || DEFAULT_OPS_ORIGIN).replace(/\/+$/, "");
}

/** The Trench Desk profile for a platform user id. */
export function deskProfileUrl(userId: string): string {
  return `${opsOrigin()}/desk/${encodeURIComponent(userId)}`;
}
