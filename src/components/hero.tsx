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
import {
  readStoredVerifiedEmail,
  subscribeWaitlistSession,
} from "@/src/lib/waitlist-session-client";

export default function Hero() {
  const hasReturningVerifiedSession = useSyncExternalStore(
    subscribeWaitlistSession,
    () => readStoredVerifiedEmail().length > 0,
    () => false,
  );

  return (
    <section
      id="hero"
      className="relative flex min-h-dvh w-full flex-col border-b border-neutral-900 bg-black"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[1550px] flex-1 flex-col px-4 md:px-6 lg:px-8">
        <div className="fixed top-0 left-0 right-0 z-30 border-b border-white/10 bg-black">
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
                className="text-xs font-medium tracking-wide text-white/90 transition-colors hover:text-white md:text-sm"
              >
                Join Early Access
              </a>
            </div>
          </nav>
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-stretch lg:flex-row">
          <div className="order-2 flex w-full flex-col items-center justify-center gap-4 py-12 lg:order-1 lg:sticky lg:top-0 lg:h-dvh lg:w-[32%] lg:shrink-0 lg:self-start lg:pr-8">
            <Morphing />
          </div>

          <div className="relative order-1 flex w-full flex-1 flex-col items-center gap-5 border-neutral-900 px-2 pb-10 pt-24 text-center lg:order-2 lg:w-[36%] lg:flex-none lg:border-x lg:border-dashed lg:pt-24">
            <div
              id="waitlist"
              className="flex w-full min-h-[calc(100dvh-9rem)] shrink-0 flex-col items-center justify-center gap-8 px-1 pb-4 pt-2 lg:min-h-[calc(100dvh-10rem)]"
            >
              {!hasReturningVerifiedSession && <AIInsights />}
              <div className="flex flex-col items-center gap-6">
                <h1 className="w-[min(100%,450px)] text-4xl font-medium text-white md:text-4xl">
                  {hasReturningVerifiedSession
                    ? "Welcome to TrenchersAI"
                    : "AI Native Trading Terminal For The Trenches"}
                </h1>
                <EmailCapture />
                <p className="max-w-[520px] text-[12px] leading-5 text-neutral-400">
                  Early access is limited. Cryptocurrency trading carries
                  substantial risk of loss.
                </p>
              </div>
            </div>

            <div
              className="w-full shrink-0 min-h-12 lg:min-h-20"
              aria-hidden
            />

            <div className="flex w-full flex-col items-center px-1 pb-12 pt-2">
              <div className="w-full origin-top scale-[0.93] sm:scale-[0.95]">
                <WhyTrenchersAICards />
              </div>
            </div>
          </div>

          <div className="order-3 flex w-full flex-col items-center justify-center py-12 lg:order-3 lg:sticky lg:top-0 lg:h-dvh lg:w-[32%] lg:shrink-0 lg:self-start lg:pl-8">
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
