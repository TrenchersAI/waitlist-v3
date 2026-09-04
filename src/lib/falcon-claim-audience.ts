// Who the Falcon claim campaign may mail, defined ONCE.
//
// The sender and the analytics dashboard both need this answer, and they must
// not drift. When they did, the dashboard reported people as "still to send"
// that the sender would never process, and derived its unmailable count by
// subtraction -- so a disagreement between the two showed up as a wrong number
// rather than as an error.
//
// Kept dependency-free (plain predicates over a row shape) so both a script and
// a route handler can use it without either importing the other's world.

/// The campaign key written by `scripts/seed-tier-claims.ts`. Every read of
/// `tier_claim_grants` must filter on it: the table is explicitly designed to
/// hold more than one campaign at a time, so an unscoped count silently folds
/// a future campaign's claims into this one's rates.
export const FALCON_CLAIM_CAMPAIGN = "waitlist-falcon-2026-08";

/// The subset of a subscriber this decision reads.
export type AudienceRow = {
  falconClaimSentAt: Date | null;
  unsubscribedAt: Date | null;
  betaInvite: {
    unsubscribedAt: Date | null;
    // The FIRST send's outcome...
    bouncedAt: Date | null;
    complainedAt: Date | null;
    suppressedAt: Date | null;
    // ...and every later send's, because a hard failure is a fact about the
    // ADDRESS, not about the campaign that happened to discover it. An address
    // that bounced the activation nudge is just as unreachable here.
    reminderBouncedAt: Date | null;
    reminderComplainedAt: Date | null;
    nudgeBouncedAt: Date | null;
    nudgeComplainedAt: Date | null;
    featureBouncedAt: Date | null;
    featureComplainedAt: Date | null;
    falconBouncedAt: Date | null;
    falconComplainedAt: Date | null;
  } | null;
  surveyInvite: {
    unsubscribedAt: Date | null;
    bouncedAt: Date | null;
    complainedAt: Date | null;
  } | null;
};

/// An opt-out is GLOBAL, so it counts from wherever it was recorded. A hard
/// bounce or a Resend suppression means the address is unreachable: mailing it
/// again cannot succeed, and costs reputation to fail.
export function isSuppressed(r: AudienceRow): boolean {
  const b = r.betaInvite;
  const s = r.surveyInvite;
  return (
    r.unsubscribedAt != null ||
    s?.unsubscribedAt != null ||
    b?.unsubscribedAt != null ||
    // A bounce or complaint on ANY previous send. Checking only the first
    // send's columns missed five later ones, so an address that hard-bounced
    // the nudge or the Falcon mail was still treated as reachable -- mailing
    // it again cannot succeed and costs reputation to fail.
    s?.bouncedAt != null ||
    s?.complainedAt != null ||
    b?.bouncedAt != null ||
    b?.complainedAt != null ||
    b?.suppressedAt != null ||
    b?.reminderBouncedAt != null ||
    b?.reminderComplainedAt != null ||
    b?.nudgeBouncedAt != null ||
    b?.nudgeComplainedAt != null ||
    b?.featureBouncedAt != null ||
    b?.featureComplainedAt != null ||
    b?.falconBouncedAt != null ||
    b?.falconComplainedAt != null
  );
}

/// Domains Resend refuses outright, separately from address SYNTAX: RFC 2606
/// names reserved for documentation and testing. They are syntactically
/// perfect, so the pattern below passes them and the API rejects the whole
/// batch. Nobody is reachable at them.
const RESERVED_DOMAIN =
  /^(example\.(com|net|org)|test\.(com|net|org)|localhost|invalid)$|\.(test|example|invalid|localhost|local)$/i;

/// A WHITELIST, not a blacklist, and that is the lesson from writing it twice.
/// The first version banned characters it could think of and still let
/// `g^@g.com` through, because a caret was not on the list. Enumerating what is
/// allowed is finite; enumerating what is forbidden is not.
///
/// Deliberately stricter than RFC 5322 and close to what mailbox providers
/// enforce -- the question is "will this send", not "is this technically
/// legal". Resend rejects an ENTIRE batch for one bad address and names
/// neither the address nor always the same reason, so a bad one costs ~100
/// reachable people.
const ADDRESS = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export function isMailable(email: string): boolean {
  if (email !== email.trim() || email.length > 254) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (local.length > 64) return false;
  if (/^\.|\.$|\.\./.test(local)) return false;
  if (RESERVED_DOMAIN.test(domain.toLowerCase())) return false;
  return ADDRESS.test(email);
}

/// Still owed the mail: not yet sent, not suppressed, and actually reachable.
export function isPending(r: AudienceRow & { email: string }): boolean {
  return r.falconClaimSentAt == null && !isSuppressed(r) && isMailable(r.email);
}

/// The exact Prisma `select` [`isSuppressed`] needs.
///
/// Exported so the sender and the dashboard cannot select DIFFERENT subsets and
/// silently disagree: a caller that omits a column would have that clause read
/// as `undefined`, which is falsy, so an address suppressed by the missing
/// column would quietly become mailable again. Sharing the predicate without
/// sharing its inputs only moves the drift somewhere harder to see.
export const AUDIENCE_SELECT = {
  email: true,
  falconClaimSentAt: true,
  unsubscribedAt: true,
  betaInvite: {
    select: {
      unsubscribedAt: true,
      bouncedAt: true,
      complainedAt: true,
      suppressedAt: true,
      reminderBouncedAt: true,
      reminderComplainedAt: true,
      nudgeBouncedAt: true,
      nudgeComplainedAt: true,
      featureBouncedAt: true,
      featureComplainedAt: true,
      falconBouncedAt: true,
      falconComplainedAt: true,
    },
  },
  surveyInvite: {
    select: { unsubscribedAt: true, bouncedAt: true, complainedAt: true },
  },
} as const;
