"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import TokenList from "./tokens";
import EmailCapture from "./email-capture";
import Morphing from "./morphing";
import AIAgent from "./ai-agent";
import logoMark from "./icons/logo-mark.svg";
import AIInsights from "./ai-insights";
import { WhyTrenchersAICards } from "./why-trenchersai";
import AiIcon from "../icons/ai-icon";
import CopyIcon from "../icons/copy-icon";
import SnipeIcon from "../icons/snipe-icon";
import TrackingIcon from "../icons/tracking-icon";
import {
  readStoredVerifiedEmail,
  subscribeWaitlistSession,
} from "@/src/lib/waitlist-session-client";
import { useHydrated } from "@/src/hooks/use-hydrated";

/** Feature strip items shown above AIInsights — gives the page a one-line
   summary of what the product does. Source SVGs are drawn in black, so the
   container's `[&_svg]:invert` flips them to white on the dark surface. */
const FEATURE_STRIP_ITEMS = [
  { label: "Snipe New Launches", icon: <SnipeIcon /> },
  { label: "AI Trading Agents", icon: <AiIcon /> },
  { label: "Live Onchain Tracking", icon: <TrackingIcon /> },
  { label: "Copy Whales Trades", icon: <CopyIcon /> },
];

type HeroProps = {
  /** Server-rendered hint from the `trencher_verified` cookie. Lets the SSR
     HTML render the verified shell (no AIInsights, "Welcome to TrenchersAI"
     headline, EmailCapture's verified card) so returning users don't see the
     unverified shell flash on refresh. The post-hydration localStorage
     snapshot can still revoke this if the cookie went stale. */
  initialVerified?: boolean;
};

export default function Hero({ initialVerified = false }: HeroProps) {
  const hydrated = useHydrated();
  const storedSession = useSyncExternalStore(
    subscribeWaitlistSession,
    () => readStoredVerifiedEmail().length > 0,
    () => false,
  );
  /** Pre-hydration (SSR + first client commit): trust the cookie hint so the
     server-rendered HTML matches what the client will paint. Post-hydration:
     trust localStorage so we react to the user signing out in another tab. */
  const hasReturningVerifiedSession = hydrated ? storedSession : initialVerified;

  return (
    <section
      id="hero"
      className="site-canvas-bg relative flex min-h-dvh w-full flex-col border-b border-neutral-900"
    >
      <div className="mx-auto flex w-full min-w-0 max-w-[1550px] flex-1 flex-col px-4 md:px-6 lg:min-h-dvh lg:px-8">
        <div className="site-canvas-bg fixed top-0 left-0 right-0 z-50 w-full border-b border-neutral-900 bg-black">
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 md:px-6 md:py-5 lg:px-8">
            <div className="flex items-center gap-2.5">
              <Image
                src={logoMark}
                alt="TrenchersAI logo"
                width={28}
                height={25}
                className="h-[25px] w-[28px]"
                priority
              />
              <span className="text-lg tracking-wide text-white">
                TrenchersAI
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-white/70">
              <a
                href="#waitlist"
                className="shimmer-text-nav text-xs font-medium tracking-wide outline-offset-4 transition-[filter] duration-200 hover:brightness-110 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/35 md:text-sm"
              >
                Join Early Access
              </a>
            </div>
          </nav>
        </div>
        <div className="flex w-full flex-1 flex-col items-stretch lg:min-h-0 lg:flex-row">
          <div className="order-2 hidden w-full flex-col items-center justify-center gap-4 py-12 lg:order-1 lg:flex lg:sticky lg:top-0 lg:h-dvh lg:w-[32%] lg:shrink-0 lg:self-start lg:pr-8">
            <Morphing />
          </div>

          <div className="relative order-1 flex w-full flex-col border-neutral-900 px-0 pt-20 text-center lg:order-2 lg:w-[36%] lg:flex-none lg:border-x lg:border-dashed lg:px-2 lg:pt-24">
            {/* Flat wash behind center column so section radial/grain does not read through */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 bg-[#0a0a0a]/36"
            />

            {/* Center column: one normal document flow — page scroll moves
               marquee, headline, email, insights, and cards together. */}
            <div
              id="waitlist"
              className="relative z-10 flex w-full flex-col items-center gap-10 px-4 pb-10 pt-2 sm:gap-12 sm:px-0 sm:pt-2 lg:gap-12 lg:px-1"
            >
              {!hasReturningVerifiedSession && (
                <div className="feature-strip-marquee w-full max-w-5xl">
                  <div className="feature-strip-track">
                    {[...FEATURE_STRIP_ITEMS, ...FEATURE_STRIP_ITEMS].map(
                      (feature, index) => (
                        <span
                          key={`${feature.label}-${index}`}
                          className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium tracking-wide text-white/90 [&_svg]:opacity-90 [&_svg]:invert sm:text-sm"
                        >
                          {feature.icon}
                          {feature.label}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="z-30 flex w-full flex-col items-center gap-6 sm:gap-7">
                <h1 className="w-full min-w-0 max-w-[450px] text-balance text-3xl font-medium leading-[1.05] tracking-[-0.01em] text-white md:text-4xl">
                  {hasReturningVerifiedSession
                    ? "Welcome to TrenchersAI"
                    : "AI Native Trading Terminal For The Trenches"}
                </h1>
                <EmailCapture initialVerified={initialVerified} />
              </div>

              {!hasReturningVerifiedSession && (
                <>
                  <div className="flex w-full flex-col items-stretch gap-3 border-t border-white/8 bg-black/35 px-4 py-5 sm:items-center sm:px-6 sm:py-6 lg:px-8">
                    <span className="text-center font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500 sm:text-xs">
                      Sample · Live agent output
                    </span>
                    <AIInsights className="!max-w-none sm:max-w-[min(100%,640px)] lg:max-w-[min(100%,720px)]" />
                  </div>
                  <div className="w-full px-4 text-left sm:px-6 lg:px-8">
                    <WhyTrenchersAICards className="mx-auto max-w-none sm:max-w-none md:max-w-[min(100%,28rem)] lg:max-w-[min(100%,36rem)]" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right column: desktop-only sticky lane (AI agent + token list). */}
          <div className="order-3 hidden w-full flex-col items-center justify-center py-12 lg:order-3 lg:flex lg:sticky lg:top-0 lg:h-dvh lg:w-[32%] lg:shrink-0 lg:self-start lg:pl-8">
            <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-6">
              <AIAgent />
              <TokenList className="w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
