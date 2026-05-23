"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BorderBeam } from "border-beam";
import { useReducedMotion } from "motion/react";

import SiteNav from "@/src/components/site-nav";
import { Skeleton } from "@/src/components/ui/skeleton";
import { readStoredVerifiedEmail } from "@/src/lib/waitlist-session-client";

type Phase = "email" | "otp";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;

const CARD_CLASS =
  "relative isolate overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.04] backdrop-blur-md";

export default function SurveyEntry() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // While true, the form is suppressed. We start in this state on mount
  // and flip it off once we know whether a stored verified email exists
  // (and, if it does, after we've kicked off the redirect to /survey/
  // <token>). This avoids flashing the email form when the user is
  // already verified — common when they click the dashboard CTA.
  const [checking, setChecking] = useState(true);

  // --- helpers -----------------------------------------------------------

  // After verification (or for an already-verified subscriber) we exchange
  // the email for a survey token and bounce to /survey/<token>. The lookup
  // endpoint is idempotent so calling it twice (e.g., after OTP) is fine.
  const exchangeAndRedirect = useCallback(
    async (forEmail: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/survey/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: forEmail }),
        });
        if (!res.ok) {
          setMessage("Something went wrong. Try again.");
          return false;
        }
        const data = (await res.json()) as
          | { status: "ok"; token: string }
          | { status: "needs_otp" };
        if (data.status === "ok") {
          router.replace(`/survey/${data.token}`);
          return true;
        }
        return false;
      } catch {
        setMessage("Network error. Try again.");
        return false;
      }
    },
    [router],
  );

  // --- auto-resume for already-verified visitors --------------------------

  // Read the locally stored verified email on mount. If present, hit the
  // lookup endpoint and bounce straight to /survey/<token>, skipping the
  // email/OTP steps entirely. Falls through to the manual form if the
  // stored email isn't actually verified server-side (cookie stale, DB
  // reset, etc.) — in that case we prefill the input so the user only
  // has to click Continue.
  useEffect(() => {
    let cancelled = false;
    const stored = readStoredVerifiedEmail();
    if (!stored) {
      setChecking(false);
      return;
    }
    setEmail(stored);
    (async () => {
      try {
        const res = await fetch("/api/survey/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: stored }),
        });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as
            | { status: "ok"; token: string }
            | { status: "needs_otp" };
          if (data.status === "ok") {
            router.replace(`/survey/${data.token}`);
            // Keep `checking` true — the redirect is in flight; we don't
            // want to flash the form between now and the route change.
            return;
          }
        }
      } catch {
        // Network blip — fall through to the manual form.
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // --- email step --------------------------------------------------------

  const onSubmitEmail = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(trimmed)) {
        setMessage("Please enter a valid email.");
        return;
      }
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch("/api/survey/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as
            | { message?: string }
            | null;
          setMessage(data?.message ?? "Could not look up that email.");
          return;
        }
        const data = (await res.json()) as
          | { status: "ok"; token: string }
          | { status: "needs_otp" };
        if (data.status === "ok") {
          // Verified subscriber → straight into the form.
          setEmail(trimmed);
          router.replace(`/survey/${data.token}`);
          return;
        }
        // Not verified (or doesn't exist). Trigger the same OTP flow used
        // by the homepage waitlist form and pivot to the OTP step. We
        // call /api/waitlist directly here rather than duplicating its
        // logic — it'll create the subscriber if missing.
        const otpRes = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        const otpData = (await otpRes.json().catch(() => null)) as
          | {
              message?: string;
              verified?: boolean;
              retryAfterSeconds?: number;
            }
          | null;
        if (otpRes.ok && otpData?.verified) {
          // Edge case: between our lookup and the /api/waitlist call,
          // the user got verified. Re-do the exchange and redirect.
          setEmail(trimmed);
          await exchangeAndRedirect(trimmed);
          return;
        }
        if (!otpRes.ok) {
          setMessage(otpData?.message ?? "Could not send the code.");
          return;
        }
        setEmail(trimmed);
        setPhase("otp");
        setMessage(
          "We sent a 6-digit code. Check your inbox (and spam, just in case).",
        );
      } finally {
        setLoading(false);
      }
    },
    [email, exchangeAndRedirect, router],
  );

  // --- otp step ----------------------------------------------------------

  const onSubmitOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedOtp = otp.trim();
      if (!OTP_REGEX.test(trimmedOtp)) {
        setMessage("Enter the 6-digit code.");
        return;
      }
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: trimmedOtp }),
        });
        const data = (await res.json().catch(() => null)) as
          | {
              message?: string;
              verified?: boolean;
            }
          | null;
        if (!res.ok || !data?.verified) {
          setMessage(data?.message ?? "Invalid or expired code.");
          return;
        }
        await exchangeAndRedirect(email);
      } finally {
        setLoading(false);
      }
    },
    [email, exchangeAndRedirect, otp],
  );

  const onBack = useCallback(() => {
    setPhase("email");
    setOtp("");
    setMessage(null);
  }, []);

  // --- view --------------------------------------------------------------

  const formContent = (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-5">
          {/* HERO — sized to feel proportional to the modal card below
             rather than the full hero treatment used inside the survey
             form. Headline + one line of copy, centered. */}
          <header className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-balance text-[1.625rem] font-medium leading-[1.15] tracking-[-0.02em] text-white sm:text-[1.875rem]">
              {phase === "email"
                ? "Tell us about your trenches."
                : "Verify it's you."}
            </h1>
            <p className="max-w-[36ch] text-pretty text-[13.5px] leading-[1.55] text-white/60">
              {phase === "email"
                ? "Enter the email you used on the waitlist."
                : `We sent a 6-digit code to ${email}. Enter it to continue.`}
            </p>
          </header>

          {/* FORM CARD */}
          {phase === "email" ? (
            <form onSubmit={onSubmitEmail} className={`${CARD_CLASS} p-4 sm:p-5`}>
              <label
                htmlFor="survey-email"
                className="mb-1.5 block text-[11px] font-medium tracking-[0.08em] text-white/55 uppercase"
              >
                Email
              </label>
              <input
                id="survey-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                className="h-9 w-full rounded-md border border-white/12 bg-black/35 px-3 text-[13.5px] text-white outline-none transition-[box-shadow,border-color] placeholder:text-white/30 focus:border-white/35 focus:ring-2 focus:ring-white/15 disabled:opacity-60"
              />
              <div className="mt-2.5">
                <SubmitPill
                  active={!prefersReducedMotion && !loading}
                  disabled={loading || !email.trim()}
                  label={loading ? "Checking…" : "Continue"}
                  fullWidth
                />
              </div>
            </form>
          ) : (
            <form onSubmit={onSubmitOtp} className={`${CARD_CLASS} p-4 sm:p-5`}>
              <label
                htmlFor="survey-otp"
                className="mb-1.5 block text-[11px] font-medium tracking-[0.08em] text-white/55 uppercase"
              >
                Verification code
              </label>
              <input
                id="survey-otp"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoFocus
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="• • • • • •"
                disabled={loading}
                className="h-10 w-full rounded-md border border-white/12 bg-black/35 px-3 text-center font-mono text-base tracking-[0.4em] text-white outline-none transition-[box-shadow,border-color] placeholder:text-white/20 placeholder:tracking-[0.3em] focus:border-white/35 focus:ring-2 focus:ring-white/15 disabled:opacity-60"
              />
              <div className="mt-2.5">
                <SubmitPill
                  active={!prefersReducedMotion && !loading}
                  disabled={loading || otp.length !== 6}
                  label={loading ? "Verifying…" : "Verify & open survey"}
                  fullWidth
                />
              </div>
              <button
                type="button"
                onClick={onBack}
                className="mt-3 block w-full text-center text-[12px] text-white/45 hover:text-white/75"
                disabled={loading}
              >
                ← Use a different email
              </button>
            </form>
          )}

          {message ? (
            <p
              className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-center text-[13px] leading-snug text-white/70"
              role="status"
            >
              {message}
            </p>
          ) : null}

          {loading ? (
            <Skeleton className="h-2 w-full rounded-full opacity-40" />
          ) : null}

          <p className="text-center text-[11px] leading-relaxed text-white/35">
            Open the link in your invite email if you have one. Either path
            ends in the same survey.
          </p>
        </div>
  );

  return (
    <div className="site-canvas-bg relative flex min-h-dvh flex-col overflow-x-clip">
      <SiteNav />
      <main className="relative flex flex-1 items-center justify-center px-5 py-20 sm:px-6 sm:py-24 md:px-8">
        {checking ? <CheckingSplash /> : formContent}
      </main>
    </div>
  );
}

function CheckingSplash() {
  return (
    <div
      className="flex flex-col items-center gap-3 text-white/55"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className="size-5 animate-spin rounded-full border-2 border-white/15 border-t-white/70"
      />
      <p className="text-[12.5px]">Opening your survey…</p>
    </div>
  );
}

function SubmitPill({
  active,
  disabled,
  label,
  fullWidth,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  /** When true, fills its container at all breakpoints — used on the
     email step where the CTA should span the card width. Defaults to
     auto-width on sm+ for use in flex rows (e.g., the OTP step). */
  fullWidth?: boolean;
}) {
  return (
    <BorderBeam
      size="line"
      theme="dark"
      colorVariant="ocean"
      duration={2.4}
      strength={0.62}
      borderRadius={9999}
      active={active}
      className={
        fullWidth ? "w-full shrink-0" : "w-full shrink-0 sm:w-auto"
      }
    >
      <button
        type="submit"
        disabled={disabled}
        className={
          "inline-flex h-9 w-full items-center justify-center rounded-full border border-white/15 bg-black px-5 text-[13px] font-medium text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/35 disabled:cursor-not-allowed disabled:opacity-60 " +
          (fullWidth ? "" : "sm:w-auto sm:min-w-[200px]")
        }
      >
        {label}
      </button>
    </BorderBeam>
  );
}
