"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { BorderBeam } from "border-beam";
import { useReducedMotion } from "motion/react";
import EmailCapture from "./email-capture";
import logoMark from "./icons/logo-mark.svg";
import {
  PreviewSection,
  ProblemSection,
  SolutionSection,
} from "./why-trenchersai";
import AiIcon from "../icons/ai-icon";
import CopyIcon from "../icons/copy-icon";
import SnipeIcon from "../icons/snipe-icon";
import TrackingIcon from "../icons/tracking-icon";
import {
  readStoredVerifiedEmail,
  subscribeWaitlistSession,
} from "@/src/lib/waitlist-session-client";
import { useHydrated } from "@/src/hooks/use-hydrated";

/** Items shown in the horizontal marquee above the headline. Source SVGs are
   drawn in black, so the wrapper's ⁠ [&_svg]:invert ⁠ flips them to white on
   the dark canvas. */
const FEATURE_STRIP_ITEMS = [
  { label: "Snipe New Launches", icon: <SnipeIcon /> },
  { label: "AI Trading Agents", icon: <AiIcon /> },
  { label: "Live Onchain Tracking", icon: <TrackingIcon /> },
  { label: "Copy Whales Trades", icon: <CopyIcon /> },
];

type HeroProps = {
  /** Server-rendered hint from the ⁠ trencher_verified ⁠ cookie. Lets the SSR
     HTML render the verified shell ("Welcome to TrenchersAI" + EmailCapture's
     verified dashboard) so returning users don't see the unverified shell
     flash on refresh. The post-hydration localStorage snapshot can still
     revoke this if the cookie went stale. */
  initialVerified?: boolean;
};

export default function Hero({ initialVerified = false }: HeroProps) {
  const [suppressVerifiedWelcomeChrome, setSuppressVerifiedWelcomeChrome] =
    useState(false);
  const hydrated = useHydrated();
  const storedSession = useSyncExternalStore(
    subscribeWaitlistSession,
    () => readStoredVerifiedEmail().length > 0,
    () => false,
  );
  /** Pre-hydration (SSR + first client commit): trust the cookie hint so the
     server-rendered HTML matches what the client will paint. Post-hydration:
     trust localStorage so we react to the user signing out in another tab. */
  const hasReturningVerifiedSession = hydrated
    ? storedSession
    : initialVerified;

  const showVerifiedWelcomeHeadline =
    hasReturningVerifiedSession && !suppressVerifiedWelcomeChrome;

  return (
    <>
      <SiteNav />

      <section
        id="hero"
        className="site-canvas-bg relative w-full overflow-hidden"
      >
        {/* Soft top accent glow - single subtle indigo wash so the eye lands
           on the headline. Sized in viewport units so it scales with display. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[min(900px,110vw)] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(94,104,255,0.22),transparent_72%)] blur-2xl"
        />

        <div
          id="waitlist"
          className="relative mx-auto flex w-full min-w-0 max-w-[1240px] flex-col items-center px-5 pb-20 pt-32 text-center md:px-8 md:pt-40 md:pb-28"
        >
          {!hasReturningVerifiedSession && (
            <div className="feature-strip-marquee mb-1 w-full max-w-[640px]">
              <div className="feature-strip-track">
                {/* Items duplicated 4x so the track always spans wider than
                   any viewport. Keyframes translate -50% (i.e. 2 of the 4
                   sets), so the second half lands exactly where the first
                   half started - seamless infinite loop. */}
                {Array.from({ length: 4 })
                  .flatMap(() => FEATURE_STRIP_ITEMS)
                  .map((feature, index) => (
                    <span
                      key={`${feature.label}-${index}`}
                      className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[10.5px] font-medium tracking-wide text-white/70 [&_svg]:size-3.5 [&_svg]:opacity-80 [&_svg]:invert sm:text-[11.5px]"
                    >
                      {feature.icon}
                      {feature.label}
                    </span>
                  ))}
              </div>
            </div>
          )}

          <h1
            className={`text-balance font-medium leading-[1.04] tracking-[-0.02em] text-white ${
              hasReturningVerifiedSession
                ? "mt-6 text-[34px] sm:text-[44px] md:text-[52px]"
                : "mt-7 max-w-[min(1120px,100%)] text-[40px] sm:text-[56px] md:text-[68px]"
            }`}
          >
            {showVerifiedWelcomeHeadline ? (
              "Welcome to TrenchersAI"
            ) : hasReturningVerifiedSession ? (
              `You're in the trenches.`
            ) : (
              <>
                An AI-native trading terminal,
                <span className="text-white/55"> made for the trenches.</span>
              </>
            )}
          </h1>

          {!hasReturningVerifiedSession && (
            <p className="mt-7 max-w-[640px] text-balance text-[15px] leading-[1.65] text-white/55 sm:mt-8 sm:text-[17px] md:text-[18px]">
              Spawn AI trading agents from chat. Discover, snipe, copy, track,
              and manage positions, all from one terminal built for speed.
            </p>
          )}

          <div className="mt-10 flex w-full justify-center md:mt-11">
            <EmailCapture
              initialVerified={initialVerified}
              onVerifiedFollowGateOpen={() =>
                setSuppressVerifiedWelcomeChrome(true)
              }
              onVerifiedFollowGateClose={() =>
                setSuppressVerifiedWelcomeChrome(false)
              }
            />
          </div>

          {!hasReturningVerifiedSession && (
            <p className="max-w-[520px] text-balance text-[12px] tracking-wide text-white/35">
              Early access is limited. Cryptocurrency trading carries substantial
              risk of loss.
            </p>
          )}
        </div>
      </section>

      <>
        <ProblemSection />
        <SolutionSection />
        <PreviewSection />
      </>
    </>
  );
}

/* ----------------------------------------------------------------------- */
/* Sticky glassy site navigation                                            */
/* ----------------------------------------------------------------------- */

function SiteNav() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/6 bg-black/55 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3.5 md:px-8">
        <a
          href="/"
          className="flex items-center gap-2.5 text-white outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <Image
            src={logoMark}
            alt="TrenchersAI logo"
            width={26}
            height={23}
            className="h-[23px] w-[26px]"
            priority
          />
          <span className="text-[15px] font-medium tracking-wide">
            TrenchersAI
          </span>
        </a>

        <div className="flex items-center gap-1.5">
          <a
            href="/about-us"
            className="hidden rounded-full px-3 py-1.5 text-[13px] font-medium text-white/60 transition-colors hover:text-white sm:inline-flex"
          >
            About
          </a>
          <BorderBeam
            size="line"
            theme="dark"
            colorVariant="ocean"
            duration={2.4}
            strength={0.62}
            borderRadius={9999}
            active={!prefersReducedMotion}
            className="shrink-0"
          >
            <a
              href="#waitlist"
              className="inline-flex items-center rounded-full border border-white/15 bg-black px-3.5 py-1.5 text-[12.5px] font-semibold text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/35"
            >
              Get Early Access
            </a>
          </BorderBeam>
        </div>
      </nav>
    </header>
  );
}
