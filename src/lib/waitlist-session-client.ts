/** Browser-only: verified waitlist email persisted for returning visitors. */
export const TRENCHER_VERIFIED_EMAIL_KEY = "trencher_verified_email";

export const WAITLIST_SESSION_CHANGED_EVENT = "waitlist:session-changed";

/** SSR-readable mirror of the verified flag. The server can't see localStorage,
   so a tiny soft-signal cookie lets `app/page.tsx` render the right shell on
   first byte (see Hero's `initialVerified` prop). The actual referral data
   still comes from localStorage post-hydration; the cookie is only a hint. */
export const VERIFIED_COOKIE_NAME = "trencher_verified";

/** 30 days in seconds — long enough that returning users almost always get the
   verified shell, short enough that abandoned sessions don't linger forever. */
const VERIFIED_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export function readStoredVerifiedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(TRENCHER_VERIFIED_EMAIL_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function dispatchWaitlistSessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WAITLIST_SESSION_CHANGED_EVENT));
}

export function subscribeWaitlistSession(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener("storage", handler);
  window.addEventListener(WAITLIST_SESSION_CHANGED_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(WAITLIST_SESSION_CHANGED_EVENT, handler);
  };
}

/** Persist the verified email in localStorage *and* drop the SSR-readable
   cookie hint, then notify subscribers in this tab. Use this everywhere a
   verified session begins (post-OTP, "already verified" server response). */
export function setVerifiedSession(email: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRENCHER_VERIFIED_EMAIL_KEY, email);
  } catch {
    // private mode, quota exceeded, or storage disabled — drop silently
  }
  try {
    document.cookie = `${VERIFIED_COOKIE_NAME}=1; path=/; max-age=${VERIFIED_COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    // some embedded webviews disallow document.cookie writes
  }
  dispatchWaitlistSessionChanged();
}

/** Inverse of `setVerifiedSession` — clear both stores and notify. Use whenever
   the API rejects the stored flag (stale OTP cleanup) so the next refresh
   doesn't re-render the verified shell against an empty localStorage. */
export function clearVerifiedSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TRENCHER_VERIFIED_EMAIL_KEY);
  } catch {
    // ignore
  }
  try {
    document.cookie = `${VERIFIED_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
  } catch {
    // ignore
  }
  dispatchWaitlistSessionChanged();
}
