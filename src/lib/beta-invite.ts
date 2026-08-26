// Beta-access invite campaign: audience segmentation and send policy.
//
// Context that drives every decision in this file - from the pre-send audit
// of the waitlist v3 list (scripts/list-hygiene-audit.ts):
//
//   * 10,474 verified subscribers, 82% of them on gmail.com.
//   * ~2,730 of them were referred by accounts with 50+ referrals each
//     (top account: 681 referrals). Only 12.5% of that cohort ever opened
//     the survey link, vs 31% of organic signups. That is a referral farm.
//   * ~1,145 sit on a handful of no-name domains (wshu.net alone has 806)
//     whose signups arrived in tight bursts and are ~100% referred. Those
//     are almost certainly catch-all domains owned by the farmer.
//   * The Resend webhook was never configured, so the previous 10,474-email
//     survey send produced ZERO recorded bounces or complaints. We have no
//     measured bounce history for this list.
//
// Because Gmail's sender reputation is driven by how gmail.com recipients
// react, blasting the farm cohort - real, verified Gmail addresses attached
// to people who signed up only to farm a referral count - is the single
// fastest way to push complaint rate past Gmail's 0.3% threshold and burn
// the domain right as we launch. So the list is graded into waves and the
// send walks them best-first, with the option to stop after any wave.

export const BETA_CAMPAIGN = "beta-access-v1";

/// Domains whose signup pattern (tight burst, ~100% referred, no
/// engagement) marks them as farmer-controlled catch-alls rather than real
/// mailboxes. Verified via OTP only because the farmer controls the domain
/// and can read every mailbox on it.
export const FARM_DOMAINS = [
  "wshu.net",
  "nick.id.vn",
  "wqeather.com",
  "webkugel.com",
  "trepolan.com",
  "tainela.com",
] as const;

/// Disposable / throwaway providers. Mail here either bounces or lands in a
/// mailbox nobody reads.
export const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
] as const;

/// Role addresses. These reach a shared inbox, and shared inboxes report
/// spam at a much higher rate than personal ones.
export const ROLE_LOCALPARTS = [
  "admin",
  "info",
  "support",
  "sales",
  "contact",
  "noreply",
  "no-reply",
  "postmaster",
  "abuse",
  "webmaster",
  "billing",
] as const;

/// A referrer with more than this many referrals is farming, not sharing.
/// The distribution is bimodal: genuine sharers top out around 20, then
/// there is a gap, then the farm accounts start at 60+.
export const FARM_REFERRER_THRESHOLD = 50;

export type InviteWave =
  /// Completed the survey. Confirmed deliverable, confirmed human,
  /// demonstrably high intent. The safest possible first send.
  | "wave-1-completed"
  /// Opened the tokenized survey link but did not finish. Still a proven
  /// real mailbox with a real person behind it.
  | "wave-2-engaged"
  /// Signed up directly (not referred), verified by OTP, but never opened
  /// the survey. Legitimate signups with unproven current engagement.
  | "wave-3-organic"
  /// Referred by an ordinary referrer (under the farm threshold) and
  /// verified. Plausibly real, lower confidence.
  | "wave-4-referred"
  /// Referred by a farm account, or sitting on a farm domain. High
  /// complaint risk. Do not send without an explicit decision.
  | "wave-5-farm"
  /// Never send: unverified, unsubscribed, bounced, complained, role, or
  /// disposable.
  | "excluded";

export const WAVE_ORDER: InviteWave[] = [
  "wave-1-completed",
  "wave-2-engaged",
  "wave-3-organic",
  "wave-4-referred",
  "wave-5-farm",
];

export const WAVE_LABELS: Record<InviteWave, string> = {
  "wave-1-completed": "Completed the survey",
  "wave-2-engaged": "Opened the survey",
  "wave-3-organic": "Organic, unengaged",
  "wave-4-referred": "Referred, unengaged",
  "wave-5-farm": "Referral-farm cohort",
  excluded: "Excluded",
};

/// The rollout currently in flight, declared rather than inferred.
///
/// The dashboard has to report progress against what was actually launched,
/// and that is not derivable from the table alone. wave-2-engaged holds 1,055
/// people but this run targets 1,000 of them, so a naive "cohort minus sent"
/// would show 55 people as still queued long after the run finished, which
/// reads as a stalled send rather than a deliberate cap. Keeping the run's
/// parameters here lets the report distinguish "not mailed yet" from "not in
/// this run", and keeps one source of truth for the sender and the dashboard.
///
/// Update this when a new wave starts sending.
export const ACTIVE_ROLLOUT = {
  wave: "wave-2-engaged" as InviteWave,
  /// What we call it in conversation, not the grading rule that named the wave.
  name: "Second trench",
  /// Template key passed to scripts/send-beta-invites.ts --template.
  template: "w2",
  subject: "You're in. Welcome to the trenches.",
  /// Recipients this run will mail, which may be fewer than the cohort.
  target: 1000,
  batchSize: 84,
  spacingMinutes: 15.1,
  /// The run before this one, for a like-for-like comparison in the report.
  previousWave: "wave-1-completed" as InviteWave,
} as const;

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

export function emailLocalPart(email: string): string {
  return email.slice(0, email.lastIndexOf("@")).toLowerCase();
}

export function isFarmDomain(email: string): boolean {
  return (FARM_DOMAINS as readonly string[]).includes(emailDomain(email));
}

export function isDisposableDomain(email: string): boolean {
  return (DISPOSABLE_DOMAINS as readonly string[]).includes(emailDomain(email));
}

export function isRoleAddress(email: string): boolean {
  return (ROLE_LOCALPARTS as readonly string[]).includes(emailLocalPart(email));
}

/// Cheap structural validity check. Not a full RFC 5322 parse - it only
/// catches the shapes that reliably hard-bounce (missing TLD, whitespace,
/// double @, trailing dot). A hard bounce costs far more reputation than a
/// skipped send, so this errs toward excluding.
export function isStructurallyValid(email: string): boolean {
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) return false;
  const domain = emailDomain(email);
  if (!domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.includes("..")) return false;
  // Typo domains that will never resolve.
  if (/^gmail\.(con|co|cm|om|comm)$/.test(domain)) return false;
  if (domain === "example.com" || domain === "test.com") return false;
  return true;
}

export type WaveInput = {
  email: string;
  isVerified: boolean;
  referredById: string | null;
  /// True when the referrer's total referral count is above the farm
  /// threshold.
  referrerIsFarm: boolean;
  /// True when a SurveyResponse row exists (they opened the tokenized link).
  openedSurvey: boolean;
  /// True when that response has completedAt set.
  completedSurvey: boolean;
  /// Any prior negative signal on this address from the survey campaign.
  unsubscribed: boolean;
  bounced: boolean;
  complained: boolean;
};

/// Assigns one subscriber to a wave. Exclusions are checked first and are
/// absolute - a bounced or unsubscribed address is never mailed again
/// regardless of how engaged it once was, because re-mailing suppressed
/// addresses is what gets a sending domain blocked outright.
export function classifyWave(input: WaveInput): InviteWave {
  if (!input.isVerified) return "excluded";
  if (input.unsubscribed || input.bounced || input.complained) return "excluded";
  if (!isStructurallyValid(input.email)) return "excluded";
  if (isDisposableDomain(input.email)) return "excluded";
  if (isRoleAddress(input.email)) return "excluded";

  // Engagement outranks provenance: someone who actually completed the
  // survey is a real, interested human even if a farmer referred them.
  if (input.completedSurvey) return "wave-1-completed";
  if (input.openedSurvey) return "wave-2-engaged";

  if (isFarmDomain(input.email)) return "wave-5-farm";
  if (input.referrerIsFarm) return "wave-5-farm";
  if (input.referredById === null) return "wave-3-organic";
  return "wave-4-referred";
}
