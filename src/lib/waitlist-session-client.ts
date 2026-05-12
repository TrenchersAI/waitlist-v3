/** Browser-only: verified waitlist email persisted for returning visitors. */
export const TRENCHER_VERIFIED_EMAIL_KEY = "trencher_verified_email";

export const WAITLIST_SESSION_CHANGED_EVENT = "waitlist:session-changed";

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
