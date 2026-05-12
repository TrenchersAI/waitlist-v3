"use client";

import {
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import XIcon from "../icons/x-icon";
import TelegramIcon from "../icons/telegram-icon";
import TrenchesDashboardLoader from "./trenches-dashboard-loader";
import {
  clearVerifiedSession,
  readStoredVerifiedEmail,
  setVerifiedSession,
  subscribeWaitlistSession,
} from "@/src/lib/waitlist-session-client";
import { useHydrated } from "@/src/hooks/use-hydrated";

const LAUNCH_TWEET_URL =
  "https://x.com/TrenchersAI/status/2048148307650998392";

/** Max wait before showing the dashboard with email fallback (no referral code yet). */
const TRENCHES_DECK_LOAD_MS = 14_000;

/** Match the proxy's ref-code regex so legacy `?ref=` query links AND
   the new `/CODE` path links both populate the referrer field. */
const PATH_REF_CODE_PATTERN = /^[a-z0-9]{6,12}$/;

function getReferralCodeFromUrl() {
  if (typeof window === "undefined") return "";
  const fromQuery = new URLSearchParams(window.location.search)
    .get("ref")
    ?.trim();
  if (fromQuery) return fromQuery;
  const segment = window.location.pathname.slice(1).split("/")[0];
  return PATH_REF_CODE_PATTERN.test(segment) ? segment : "";
}

const fadeUp = {
  hidden: { opacity: 0, y: 12, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const reducedFadeUp = {
  hidden: { opacity: 1, y: 0, filter: "blur(0px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

type EmailCaptureProps = {
  /** Server-rendered hint from the `trencher_verified` cookie. Lets the SSR
     HTML render the verified card directly so returning users don't see the
     unverified shell flash on refresh. The post-hydration localStorage check
     can still revoke this if the cookie went stale. */
  initialVerified?: boolean;
};

export default function EmailCapture({
  initialVerified = false,
}: EmailCaptureProps) {
  /** Belt-and-suspenders against hydration mismatch:
     - `useSyncExternalStore` already returns "" on the server / during the
       hydration commit, then swaps to the real snapshot post-hydration.
     - `useHydrated` flips to true *after* the first client `useLayoutEffect`,
       guaranteeing the first paint mirrors the SSR HTML even if any other
       browser-only data sneaks into the render path. */
  const hydrated = useHydrated();
  const storedSnapshot = useSyncExternalStore(
    subscribeWaitlistSession,
    () => readStoredVerifiedEmail(),
    () => "",
  );
  const storedVerifiedEmail = hydrated ? storedSnapshot : "";
  const initialRefCode = getReferralCodeFromUrl();
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  /** Seeded from the cookie hint so SSR and first hydration agree on the
     verified shell for returning users. The seed effect below merges in the
     post-hydration localStorage email; the API confirmation + cookie/storage
     divergence effects can still revoke this if the cookie was stale. */
  const [isVerified, setIsVerified] = useState(initialVerified);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [trenchesLoadTimedOut, setTrenchesLoadTimedOut] = useState(false);
  const [incomingRefCode] = useState(initialRefCode);
  const [submitState, setSubmitState] = useState<{
    loading: boolean;
    message: string;
    error: boolean;
  }>({
    loading: false,
    message: "",
    error: false,
  });
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const prefersReducedMotion = useReducedMotion();
  const fadeUpVariants = prefersReducedMotion ? reducedFadeUp : fadeUp;
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const otp = otpDigits.join("");
  const normalizedEmail = email.trim().toLowerCase();
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://trenchers.xyz";
  const myReferralCode = referralCode || normalizedEmail;
  const referralUrl = `${shareUrl}/${encodeURIComponent(myReferralCode)}`;
  const tier: "Bronze" | "Silver" | "Gold" | "Diamond" =
    referralCount >= 50
      ? "Diamond"
      : referralCount >= 15
        ? "Gold"
        : referralCount >= 3
          ? "Silver"
          : "Bronze";
  const nextTierThreshold =
    referralCount < 3
      ? 3
      : referralCount < 15
        ? 15
        : referralCount < 50
          ? 50
          : 50;
  const nextTierLabel: "Silver" | "Gold" | "Diamond" =
    referralCount < 3 ? "Silver" : referralCount < 15 ? "Gold" : "Diamond";
  const previousTierFloor =
    nextTierThreshold === 50 ? 15 : nextTierThreshold === 15 ? 3 : 0;
  const tierProgressMax = Math.max(1, nextTierThreshold - previousTierFloor);
  const tierProgressCurrent = Math.min(
    tierProgressMax,
    Math.max(0, referralCount - previousTierFloor),
  );
  const tierProgressPercent = Math.min(
    100,
    Math.round((tierProgressCurrent / tierProgressMax) * 100),
  );
  const referralsNeededForNextTier = Math.max(
    0,
    nextTierThreshold - referralCount,
  );
  const onboardedTierClass =
    tier === "Diamond"
      ? "border-[#e9d5ff] bg-[linear-gradient(150deg,#020617_0%,#1e3a8a_40%,#38bdf8_52%,#3730a3_72%,#020617_100%)] shadow-[0_22px_54px_rgba(2,6,23,0.7)] ring-1 ring-white/40 [box-shadow:inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-3px_12px_rgba(15,23,42,0.68),inset_8px_0_14px_rgba(56,189,248,0.2),0_22px_54px_rgba(2,6,23,0.7)]"
      : tier === "Gold"
        ? "border-[#caa24d] bg-linear-to-br from-[#6f4f1b] via-[#b8871e] to-[#f2c766]"
        : tier === "Silver"
          ? "border-[#d1d5db] bg-linear-to-br from-[#4b5563] via-[#9ca3af] to-[#e5e7eb]"
          : "border-[#b08968] bg-linear-to-br from-[#5a3a22] via-[#9a6a3f] to-[#d4a373]";

  const handleWaitlistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setSubmitState({
        loading: false,
        message: "Please enter your email.",
        error: true,
      });
      return;
    }
    if (otpStep === "verify" && !/^\d{6}$/.test(otp.trim())) {
      setSubmitState({
        loading: false,
        message: "Please enter the 6-digit code.",
        error: true,
      });
      return;
    }

    setSubmitState({ loading: true, message: "", error: false });

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          ...(otpStep === "request" && incomingRefCode
            ? { ref: incomingRefCode }
            : {}),
          ...(otpStep === "verify" ? { otp: otp.trim() } : {}),
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        requiresOtp?: boolean;
        verified?: boolean;
        referralCode?: string;
        referralCount?: number;
        retryAfterSeconds?: number;
      };
      const message = data.message ?? "Request completed.";

      if (!response.ok) {
        if (
          response.status === 429 &&
          typeof data.retryAfterSeconds === "number"
        ) {
          setResendCooldown(data.retryAfterSeconds);
          if (data.requiresOtp) {
            setOtpStep("verify");
          }
        }
        setSubmitState({
          loading: false,
          message,
          error: true,
        });
        return;
      }

      if (typeof data.retryAfterSeconds === "number") {
        setResendCooldown(data.retryAfterSeconds);
      }

      setSubmitState({
        loading: false,
        message,
        error: false,
      });
      if (typeof data.referralCode === "string") {
        setReferralCode(data.referralCode);
      }
      if (typeof data.referralCount === "number") {
        setReferralCount(data.referralCount);
      }
      if (otpStep === "request") {
        if (data.verified) {
          setIsVerified(true);
          setOtpStep("request");
          setOtpDigits(Array(6).fill(""));
          if (normalizedEmail) {
            setVerifiedSession(normalizedEmail);
          }
        } else if (data.requiresOtp) {
          setOtpStep("verify");
        }
      } else {
        setIsVerified(true);
        setOtpDigits(Array(6).fill(""));
        setSubmitState({
          loading: false,
          message: "Welcome to Trenchers. Check your email for confirmation.",
          error: false,
        });
        if (normalizedEmail) {
          setVerifiedSession(normalizedEmail);
        }
      }
    } catch {
      setSubmitState({
        loading: false,
        message: "Unable to submit right now. Please try again.",
        error: true,
      });
    }
  };

  const updateOtpAtIndex = useCallback((index: number, digit: string) => {
    setOtpDigits((prev) => {
      const chars = [...prev];
      chars[index] = digit;
      return chars;
    });
  }, []);

  const handleOtpInputChange = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    updateOtpAtIndex(index, digit);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      updateOtpAtIndex(index - 1, "");
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;

    const nextOtpDigits = Array(6).fill("");
    for (let i = 0; i < pasted.length; i += 1) {
      nextOtpDigits[i] = pasted[i];
    }
    setOtpDigits(nextOtpDigits);
    const focusIndex = Math.min(pasted.length, 6) - 1;
    if (focusIndex >= 0) {
      otpInputRefs.current[focusIndex]?.focus();
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || submitState.loading) return;
    setSubmitState({ loading: true, message: "", error: false });
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          ...(incomingRefCode ? { ref: incomingRefCode } : {}),
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        retryAfterSeconds?: number;
      };
      if (typeof data.retryAfterSeconds === "number") {
        setResendCooldown(data.retryAfterSeconds);
      }
      setSubmitState({
        loading: false,
        message:
          data.message ??
          (response.ok
            ? "New code sent. Check your inbox."
            : "Couldn't resend."),
        error: !response.ok,
      });
    } catch {
      setSubmitState({
        loading: false,
        message: "Unable to resend right now.",
        error: true,
      });
    }
  };

  useEffect(() => {
    if (otpStep === "verify") {
      otpInputRefs.current[0]?.focus();
    }
  }, [otpStep]);

  /** Promote the post-hydration store snapshot into local form state. Runs
     once after hydration if storage holds a verified email — and stays a
     no-op when the user is mid-typing or has already been seeded so we
     never clobber in-flight input. The lint rule below flags any setState
     inside an effect; this is the documented exception for syncing a
     browser-only store snapshot into local React state after hydration. */
  useEffect(() => {
    if (!storedVerifiedEmail) return;
    if (email) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- documented exception: post-hydration sync of a browser-only store snapshot into local state
    setEmail(storedVerifiedEmail);
    setIsVerified(true);
  }, [storedVerifiedEmail, email]);

  /** Cookie/localStorage divergence guard. The SSR cookie said verified, but
     the post-hydration snapshot reveals an empty localStorage (e.g., user
     cleared site data in another tab while the cookie lingered). Wipe both
     stores and fall back to the form so the user can re-enter their email. */
  useEffect(() => {
    if (!hydrated) return;
    if (!initialVerified) return;
    if (storedSnapshot) return;
    clearVerifiedSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- documented exception: post-hydration revocation when cookie diverges from localStorage
    setIsVerified(false);
  }, [hydrated, initialVerified, storedSnapshot]);

  useEffect(() => {
    if (!storedVerifiedEmail) return;
    let cancelled = false;

    const restoreVerifiedState = async () => {
      try {
        const response = await fetch(
          `/api/waitlist?email=${encodeURIComponent(storedVerifiedEmail)}`,
        );
        if (!response.ok) {
          clearVerifiedSession();
          if (!cancelled) setIsVerified(false);
          return;
        }

        const data = (await response.json()) as {
          verified?: boolean;
          referralCode?: string;
          referralCount?: number;
        };
        if (cancelled) return;

        if (!data.verified) {
          clearVerifiedSession();
          setIsVerified(false);
          return;
        }

        setIsVerified(true);
        if (typeof data.referralCode === "string") {
          setReferralCode(data.referralCode);
        }
        if (typeof data.referralCount === "number") {
          setReferralCount(data.referralCount);
        }
      } catch {
        clearVerifiedSession();
        if (!cancelled) setIsVerified(false);
      }
    };

    void restoreVerifiedState();
    return () => {
      cancelled = true;
    };
  }, [storedVerifiedEmail]);

  useEffect(() => {
    if (!isVerified || !normalizedEmail) return;
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const response = await fetch(
          `/api/waitlist?email=${encodeURIComponent(normalizedEmail)}`,
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          referralCode?: string;
          referralCount?: number;
        };
        if (cancelled) return;
        if (typeof data.referralCode === "string") {
          setReferralCode(data.referralCode);
        }
        if (typeof data.referralCount === "number") {
          setReferralCount(data.referralCount);
        }
      } catch {
        // ignore dashboard refresh failures
      }
    };

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [isVerified, normalizedEmail]);

  useEffect(() => {
    if (!isVerified || !hydrated) {
      setTrenchesLoadTimedOut(false);
      return;
    }
    if (referralCode.length > 0) return;
    const id = window.setTimeout(() => {
      setTrenchesLoadTimedOut(true);
    }, TRENCHES_DECK_LOAD_MS);
    return () => window.clearTimeout(id);
  }, [isVerified, hydrated, referralCode]);

  const handleCopyReferral = async () => {
    /** navigator.clipboard requires a secure context and is unavailable in
       some embedded webviews. Surface a "Copy failed" state so users on
       those browsers know to copy the visible URL manually. */
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(referralUrl);
      setCopiedReferral(true);
      setCopyState("copied");
      window.setTimeout(() => {
        setCopiedReferral(false);
        setCopyState("idle");
      }, 1400);
    } catch {
      setCopiedReferral(false);
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  const handleShareOnX = () => {
    const tweetText = `I'm officially a Trencher now 🔥
just locked in early access to @TrenchersAI

Let's run it up together!
join the trenches → ${referralUrl}
#TrenchersAI`;

    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(LAUNCH_TWEET_URL)}`;

    window.open(intentUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareOnTelegram = () => {
    const telegramText = `I'm officially a Trencher now 🔥
just locked in early access to @TrenchersAI

Let's run it up together!
join the trenches:`;
    const intentUrl = `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(telegramText)}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
  };

  if (isVerified) {
    /** SSR/pre-hydration: `hydrated` is false, so we always show the loader
       skeleton (referralCode hasn't been fetched yet). Post-hydration:
       reveal the dashboard once the API responds with a referral code OR
       the 14 s timeout fires. Suppressing the timeout pre-hydration avoids
       a flash of "fallback dashboard" against an empty email on slow JS. */
    const trenchesDeckReady =
      hydrated && (referralCode.length > 0 || trenchesLoadTimedOut);

    return (
      <motion.div
        className="mx-auto w-full min-h-[440px] min-w-0 max-w-[480px] shrink-0 rounded-[20px] border border-white/10 bg-gradient-to-br from-black/55 via-black/40 to-black/30 p-6 text-left text-[#fafafa] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(255,255,255,0.06),0_24px_70px_rgba(0,0,0,0.58)] backdrop-blur-2xl [-webkit-backdrop-filter:blur(36px)] max-[420px]:p-4"
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
      >
        {!trenchesDeckReady ? (
          <TrenchesDashboardLoader />
        ) : (
          <>
        <h2 className="text-[22px] leading-[1.2] font-medium tracking-[-0.01em] text-[#fafafa]">
          You&apos;re in the trenches.
        </h2>
        <p className="mt-3 text-[13px] leading-[1.5] text-neutral-400">
          Share your referral link to onboard more trenchers.
        </p>

        <div
          className={`mt-5 min-h-[148px] rounded-[12px] border p-[1.1rem] ${onboardedTierClass}`}
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10.5px] font-medium tracking-[0.12em] text-[#fafafa]">
                TRENCHERS ONBOARDED
              </p>
              <p className="mt-2 font-mono text-[32px] leading-none font-medium text-[#fafafa]">
                {referralCount}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10.5px] font-medium tracking-[0.12em] text-[#fafafa]">
                TIER
              </p>
              <p className="mt-2 text-[13px] font-extrabold tracking-[0.08em] text-[#fafafa] uppercase">
                {tier}
              </p>
            </div>
          </div>
          <div className="mt-4 h-1 rounded-full bg-[#1f1f1f]">
            <div
              className="h-1 rounded-full bg-[#fafafa]"
              style={{ width: `${tierProgressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex min-h-[2.75rem] items-center justify-between text-[10.5px] font-medium tracking-[0.12em] text-[#fafafa]">
            <span>{`${referralsNeededForNextTier} MORE → ${nextTierLabel}`}</span>
            <span className="font-mono">{`${Math.min(referralCount, nextTierThreshold)} / ${nextTierThreshold}`}</span>
          </div>
        </div>

        <div className="mt-4 rounded-[10px] border border-neutral-800 bg-white/[0.03] py-[5px] pr-[5px] pl-[14px]">
          <div className="flex min-h-[52px] items-center gap-3 rounded-[8px] px-2 py-1">
            <p className="min-h-[2.5rem] min-w-0 flex-1 break-all font-mono text-[12px] font-medium leading-snug text-[#fafafa] sm:text-[13px]">
              {referralUrl}
            </p>
            <button
              type="button"
              onClick={() => {
                void handleCopyReferral();
              }}
              className="cursor-pointer rounded-[8px] bg-[#1f1f1f] px-[14px] py-[8px] text-[13px] font-medium text-[#fafafa] transition-all duration-200 hover:bg-[#1f1f1f]/50"
              aria-label={
                copyState === "failed"
                  ? "Copy failed. Select the link manually."
                  : copyState === "copied"
                    ? "Referral link copied"
                    : "Copy referral link"
              }
            >
              {copyState === "failed"
                ? "Copy failed"
                : copiedReferral
                  ? "Copied"
                  : "Copy"}
            </button>
          </div>
        </div>

        <div className="mt-5 border-t border-white/10 pt-5">
          <div className="rounded-[12px] border border-neutral-800/90 bg-black/35 p-2.5 sm:p-3">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-2.5">
              <button
                type="button"
                onClick={handleShareOnX}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:border-neutral-600 hover:bg-black sm:py-3 sm:text-[14px] [&_svg]:h-[18px] [&_svg]:w-[18px] sm:[&_svg]:h-5 sm:[&_svg]:w-5"
              >
                Post on X
                <XIcon />
              </button>
              <button
                type="button"
                onClick={handleShareOnTelegram}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#1e8bc4] bg-[#229ED9] px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:border-[#26a8e0] hover:bg-[#26a8e0] sm:py-3 sm:text-[14px] [&_svg]:h-[18px] [&_svg]:w-[18px] sm:[&_svg]:h-5 sm:[&_svg]:w-5"
              >
                <TelegramIcon />
                Send link
              </button>
            </div>
          </div>
        </div>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex w-full max-w-[480px] flex-col items-center gap-3"
      variants={fadeUpVariants}
      initial="hidden"
      animate="visible"
    >
      <form
        className={`flex w-full flex-col items-center gap-2 sm:gap-2 ${
          otpStep === "verify"
            ? "rounded-3xl border border-white/10 bg-gradient-to-br from-black/55 via-black/40 to-black/30 px-4 py-4 shadow-[0_12px_30px_rgba(0,0,0,0.3)] sm:p-5"
            : "sm:flex-row sm:overflow-hidden sm:rounded-full sm:bg-white/95 sm:p-1.5"
        }`}
        onSubmit={handleWaitlistSubmit}
      >
        {otpStep !== "verify" && (
          <div className="flex w-full justify-center">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Please Enter Your Email ID"
              autoComplete="email"
              inputMode="email"
              /* text-base (16px) on mobile prevents iOS Safari from zooming on focus */
              className="h-10 w-full min-w-0 rounded-full border-0 bg-white/95 px-4 text-center text-base text-black outline-none placeholder:text-neutral-800 sm:flex-1 sm:bg-transparent sm:px-4 sm:text-left sm:text-sm"
              required
            />
          </div>
        )}

        {otpStep === "verify" && (
          <div className="mb-1 flex w-full flex-nowrap items-center justify-center gap-1 px-1 sm:gap-2 sm:px-0">
            {Array.from({ length: 6 }).map((_, index) => (
              <input
                key={`otp-${index}`}
                ref={(element) => {
                  otpInputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength={1}
                value={otpDigits[index]}
                onChange={(event) =>
                  handleOtpInputChange(index, event.target.value)
                }
                onKeyDown={(event) => handleOtpKeyDown(index, event)}
                onPaste={handleOtpPaste}
                autoComplete="one-time-code"
                /* text-base on mobile to avoid iOS focus zoom; tighter on desktop */
                className="h-10 w-10 rounded-xl border border-white/30 bg-white/95 text-center text-sm font-semibold text-black outline-none focus:ring-2 focus:ring-white/60 sm:h-11 sm:w-11"
                aria-label={`Code digit ${index + 1}`}
                required
              />
            ))}
          </div>
        )}

        <div
          className={otpStep === "verify" ? "w-auto" : "w-full sm:w-auto"}
        >
          {otpStep === "verify" ? (
            <div className="mt-1 flex w-full flex-col items-center gap-4">
              <button
                type="submit"
                className="enabled:cursor-pointer inline-flex h-10 w-[15rem] max-w-full items-center justify-center rounded-full border bg-zinc-950 px-5 text-[13px] font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 sm:px-8 sm:text-sm"
                disabled={submitState.loading}
              >
                {submitState.loading
                  ? "Verifying Code..."
                  : "Verify & Join"}
              </button>
              <div className="mt-1 flex items-center justify-center gap-4 text-sm">
                <button
                  type="button"
                  className="cursor-pointer bg-transparent text-white/85 underline-offset-4 transition hover:text-white hover:underline disabled:cursor-not-allowed disabled:text-white/40"
                  onClick={() => {
                    setOtpStep("request");
                    setOtpDigits(Array(6).fill(""));
                    setSubmitState({
                      loading: false,
                      message: "",
                      error: false,
                    });
                  }}
                  disabled={submitState.loading}
                >
                  Change Email
                </button>
                <span className="text-white/25" aria-hidden>
                  |
                </span>
                <button
                  type="button"
                  className="cursor-pointer bg-transparent text-white/85 underline-offset-4 transition hover:text-white hover:underline disabled:cursor-not-allowed disabled:text-white/40"
                  onClick={handleResendOtp}
                  disabled={submitState.loading || resendCooldown > 0}
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend Code"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex w-full justify-end sm:w-auto">
              <button
                type="submit"
                className="enabled:cursor-pointer inline-flex h-10 w-full max-w-md shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-white bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:max-w-none sm:border-none sm:px-8"
                disabled={submitState.loading}
              >
                {submitState.loading ? "Sending code..." : "Join Now"}
              </button>
            </div>
          )}
        </div>
      </form>
      <p
        className={`min-h-5 text-sm ${
          submitState.message
            ? submitState.error
              ? "text-rose-300"
              : "text-emerald-300"
            : "invisible"
        }`}
        aria-live="polite"
      >
        {submitState.message || " "}
      </p>
    </motion.div>
  );
}
