"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import TokenList from "./tokens";
import EmailCapture from "./email-capture";
import Morphing from "./morphing";
import InputFeint from "./input-feint";
import { BotUnitCard, type BotUnit } from "./agent-unit-card";
import AIAgent from "./ai-agent";
import logoMark from "./icons/logo-mark.svg";
import AIInsights from "./ai-insights";
import { WhyTrenchersAICards } from "./why-trenchersai";
import {
  readStoredVerifiedEmail,
  subscribeWaitlistSession,
} from "@/src/lib/waitlist-session-client";
import { useHydrated } from "@/src/hooks/use-hydrated";

type HeroProps = {
  /** Server-rendered hint from the `trencher_verified` cookie. Lets the SSR
     HTML render the verified shell (no AIInsights, "Welcome to TrenchersAI"
     headline, EmailCapture's verified card) so returning users don't see the
     unverified shell flash on refresh. The post-hydration localStorage
     snapshot can still revoke this if the cookie went stale. */
  initialVerified?: boolean;
};

/** Demo unit for the mobile hero (replaces `<AIAgent />` + `<TokenList />`
   below `lg`, where the desktop sticky right column is hidden). */
const MOBILE_HERO_DEMO_BOT: BotUnit = {
  id: "mobile-hero-unit",
  name: "Sniper bot",
  pid: "7xh…9kp",
  balance: "$2.40k",
  delta: "+12.4%",
  trend: "#2FE0A4",
  dateLabel: "Today",
  trades: "0",
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
  const [mobileHeroBotSelected, setMobileHeroBotSelected] = useState(true);

  return (
    <section
      id="hero"
      className="site-canvas-bg relative flex min-h-dvh w-full flex-col border-b border-neutral-900"
    >
      <div className="mx-auto flex min-h-dvh w-full min-w-0 max-w-[1550px] flex-1 flex-col px-4 md:px-6 lg:px-8">
        <div className="site-canvas-bg fixed top-0 left-0 right-0 z-50 w-full border-b border-neutral-900 bg-black">
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 md:px-6 lg:px-8">
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
        <div className="flex min-h-0 flex-1 flex-col items-stretch lg:flex-row">
          <div className="order-2 hidden w-full flex-col items-center justify-center gap-4 py-12 lg:order-1 lg:flex lg:sticky lg:top-0 lg:h-dvh lg:w-[32%] lg:shrink-0 lg:self-start lg:pr-8">
            <Morphing />
          </div>

          <div className="relative order-1 flex min-h-0 w-full flex-1 flex-col items-center gap-5 border-neutral-900 px-0 pb-10 pt-24 text-center lg:order-2 lg:min-h-dvh lg:w-[36%] lg:flex-none lg:border-x lg:border-dashed lg:px-2 lg:pt-24">
            {/* Flat wash behind center column so section radial/grain does not read through */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 bg-[#0a0a0a]/36"
            />
            <div
              id="waitlist"
              className="relative z-10 flex w-full min-h-[calc(100dvh-9rem)] shrink-0 flex-col items-center justify-center gap-8 px-0 pb-4 pt-2 lg:min-h-[calc(100dvh-10rem)] lg:px-1"
            >
              <div className="flex w-full flex-col items-center lg:gap-8">
                {!hasReturningVerifiedSession && <AIInsights />}
                <div
                  className={`z-30 flex w-full flex-col items-center gap-2 ${
                    hasReturningVerifiedSession ? "" : "-mt-6 md:-mt-0"
                  }`}
                >
                  <div className="flex flex-col items-center gap-6">
                    <h1 className="w-full min-w-0 max-w-[450px] text-balance text-4xl font-medium text-white md:text-4xl">
                      {hasReturningVerifiedSession
                        ? "Welcome to TrenchersAI"
                        : "AI Native Trading Terminal For The Trenches"}
                    </h1>
                    <EmailCapture initialVerified={initialVerified} />
                    <p className="w-full min-w-0 max-w-[520px] text-balance text-[12px] leading-5 text-neutral-400">
                      Early access is limited. Cryptocurrency trading carries
                      substantial risk of loss.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Space before cards — only appears as you scroll */}
            <div
              className="relative z-10 w-full shrink-0 min-h-12 lg:min-h-20"
              aria-hidden
            />

            <div className="relative z-10 flex w-full flex-col items-center px-0 pb-12 pt-2 lg:px-1">
              <div className="w-full origin-top scale-100 sm:scale-[0.95]">
                <WhyTrenchersAICards />
              </div>
            </div>
          </div>

          <div className="order-3 flex w-full flex-col items-center justify-center py-12 lg:order-3 lg:sticky lg:top-0 lg:h-dvh lg:w-[32%] lg:shrink-0 lg:self-start lg:pl-8">
            <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-6">
              <div className="flex w-full flex-col gap-6 lg:hidden">
                <InputFeint className="w-full" />
                <BotUnitCard
                  bot={MOBILE_HERO_DEMO_BOT}
                  isSelected={mobileHeroBotSelected}
                  onSelect={() => setMobileHeroBotSelected((prev) => !prev)}
                  sparklineEntranceIndex={0}
                />
              </div>
              <div className="hidden w-full flex-col items-center gap-6 lg:flex">
                <AIAgent />
                <TokenList className="w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
