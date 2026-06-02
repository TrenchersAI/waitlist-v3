/**
 * Cloudflare Turnstile server-side verification.
 *
 * Turnstile is the "non-hindering" human check: in interaction-only mode the
 * widget is invisible to the ~95%+ of real users who pass the passive
 * checks, and only renders an interactive challenge when the visitor looks
 * automated. The browser produces a single-use token; we verify it here
 * against Cloudflare's siteverify endpoint before doing any expensive work
 * (DB write + Resend email).
 *
 * Graceful degradation: if TURNSTILE_SECRET_KEY is not set we skip the check
 * (returns ok) so local dev and a deploy made before the keys are added keep
 * working. Once the secret is set, verification is enforced.
 */

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export type TurnstileResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason: string };

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };

  if (!token) return { ok: false, reason: "missing-token" };

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteIp && remoteIp !== "unknown") form.set("remoteip", remoteIp);

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      // Don't let a slow Cloudflare call hang the request indefinitely.
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    if (data.success) return { ok: true };
    return {
      ok: false,
      reason: data["error-codes"]?.join(",") || "verification-failed",
    };
  } catch (error) {
    // A Cloudflare outage shouldn't permanently lock out signups, but it also
    // shouldn't silently disable the check. Treat it as a soft failure the
    // caller can decide on; we fail closed here since the secret IS set.
    console.error("[turnstile] siteverify error:", error);
    return { ok: false, reason: "verification-unavailable" };
  }
}
