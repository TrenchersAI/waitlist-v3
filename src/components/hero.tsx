"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import Badge from "./badge";
import PnlGrowth from "./pnl-growth";
import InputFeint from "./input-feint";
import TokenList from "./tokens";
import EmailCapture from "./email-capture";
import Morphing from "./morphing";
import { BotUnitCard, type BotUnit } from "./agent-unit-card";
import AIAgent from "./ai-agent";
import Graph from "./graph";
import MultiStepComponent from "./multi-step-component";
import logoMark from "./icons/logo-mark.svg";
import Logo from "./logo";
import AIInsights from "./ai-insights";
import { WhyTrenchersAICards } from "./why-trenchersai";

/** Demo unit for mobile hero (replaces AIAgent + tokens below `lg`). */
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

export default function Hero() {
  const [showAnimatedSections, setShowAnimatedSections] = useState(false);
  const [mobileHeroBotSelected, setMobileHeroBotSelected] = useState(true);
  const revealAnimation = {
    initial: { opacity: 0, y: 28, filter: "blur(8px)" },
    whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
    viewport: { once: true, amount: 0.45 } as const,
    transition: { duration: 0.65, ease: "easeOut" as const },
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      setShowAnimatedSections(true);
    }, 900);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <section
      id="hero"
      className="site-canvas-bg relative flex min-h-dvh w-full flex-col border-b border-neutral-900"
    >
      <div className="mx-auto flex min-h-dvh w-full min-w-0 max-w-[1550px] flex-1 flex-col px-4 md:px-6 lg:px-8">
        <div className="site-canvas-bg fixed top-0 left-0 right-0 z-50 w-full border-b border-white/10 bg-black">
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 md:px-6 lg:px-8">
            <div className="flex items-center gap-2.5">
              <Image
                src={logoMark}
                alt="Trenchersai logo"
                width={28}
                height={25}
                priority
              />
              <span className="text-lg tracking-wide text-white">
                TrenchersAI
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-white/70">
              <a
                href="#hero"
                className="shimmer-text-nav text-xs font-medium tracking-wide transition-[filter] duration-200 md:text-sm outline-offset-4 hover:brightness-110 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/35"
              >
                Join Early Access
              </a>
              {/* <Link
              href="/about-us"
              className="transition-colors hover:text-white"
            >
              Why TrenchersAI ?
            </Link> */}
              {/* <Link
              href="/about-us"
              className="transition-colors hover:text-white"
            >
              Why TrenchersAI ?
            </Link> */}
            </div>
          </nav>
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-stretch lg:flex-row">
          <div
            className={`order-2 hidden w-full flex-col items-center justify-center gap-4 py-12 transition-all duration-700 lg:order-1 lg:flex lg:sticky lg:top-0 lg:min-h-0 lg:h-dvh lg:w-[32%] lg:shrink-0 lg:pr-8 ${
              showAnimatedSections
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0"
            }`}
          >
            {/* <InputFeint />
            <PnlGrowth /> */}
            <Morphing />
          </div>

          <div className="relative order-1 flex min-h-0 w-full flex-1 flex-col items-center gap-5 border-neutral-900 px-0 pb-10 pt-24 text-center lg:order-2 lg:min-h-dvh lg:w-[36%] lg:flex-none lg:border-x lg:border-dashed lg:px-2 lg:pt-24">
            {/* Flat wash behind center column so section radial/grain does not read through */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 bg-[#0a0a0a]/36"
            />
            {/* <Morphing /> */}
            {/* <Graph /> */}
            {/* <MultiStepComponent /> */}
            {/* <Logo /> */}
            {/* First “page” inside this column: fills viewport so cards stay below until you scroll */}
            <div className="relative z-10 flex w-full min-h-[calc(100dvh-9rem)] shrink-0 flex-col items-center justify-center gap-8 px-0 pb-4 pt-2 lg:min-h-[calc(100dvh-10rem)] lg:px-1">
              <div
                className={`transition-all duration-700 ${
                  showAnimatedSections
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-2 opacity-0"
                }`}
              ></div>
              <div className="flex w-full flex-col items-center lg:gap-8">
                <div
                  className={`transition-all duration-700 ${
                    showAnimatedSections
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-2 opacity-0"
                  }`}
                >
                  <AIInsights />
                </div>
                <div className="flex w-full flex-col items-center gap-2 -mt-6 md:-mt-0 z-30">
                  <div className="flex flex-col items-center gap-6">
                    <h1 className="w-full min-w-0 max-w-[450px] text-balance text-4xl font-medium text-white md:text-4xl">
                      AI Native Trading Terminal For The Trenches
                    </h1>
                    {/* <p className="max-w-[480px] text-sm leading-6 text-neutral-400 md:text-[16px]">
                      AI-native platform for automated trading. Built for vibe
                      trenching. Snipe launches, copy whales, and automate
                      trades instantly.
                    </p> */}
                    <EmailCapture />
                    <p className="w-full min-w-0 max-w-[520px] text-balance text-[12px] leading-5 text-neutral-500">
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
                <WhyTrenchersAICards embedded />
              </div>
            </div>
            {/* <Graph /> */}
          </div>

          <div
            className={`order-3 flex w-full flex-col items-center justify-center py-12 transition-all duration-700 lg:order-3 lg:sticky lg:top-0 lg:min-h-0 lg:h-dvh lg:w-[32%] lg:shrink-0 lg:pl-8 ${
              showAnimatedSections
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0 max-lg:pointer-events-auto max-lg:translate-y-0 max-lg:opacity-100"
            }`}
          >
            <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-6">
              <div className="flex w-full flex-col gap-6 lg:hidden">
                <InputFeint className="w-full" />
                <BotUnitCard
                  bot={MOBILE_HERO_DEMO_BOT}
                  isSelected={mobileHeroBotSelected}
                  onSelect={() =>
                    setMobileHeroBotSelected((prev) => !prev)
                  }
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
