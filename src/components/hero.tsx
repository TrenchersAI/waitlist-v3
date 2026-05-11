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
import AIAgent from "./ai-agent";
import Graph from "./graph";
import MultiStepComponent from "./multi-step-component";
import logoMark from "./icons/logo-mark.svg";
import Logo from "./logo";
import AIInsights from "./ai-insights";

export default function Hero() {
  const [showAnimatedSections, setShowAnimatedSections] = useState(false);
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
      className="relative w-full min-h-screen border-b border-neutral-900"
    >
      <div className="mx-auto max-w-[1550px] px-4 md:px-6 lg:px-8">
        <div className="fixed top-0 left-0 right-0 z-30 border-b border-white/10 bg-black">
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
                className="text-xs font-medium tracking-wide text-white/90 transition-colors hover:text-white md:text-sm"
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
        <div className="flex min-h-screen flex-col items-stretch lg:flex-row">
          <div
            className={`order-2 flex w-full flex-col items-center justify-center gap-4 py-12 transition-all duration-700 lg:order-1 lg:sticky lg:top-0 lg:h-screen lg:w-[32%] lg:pr-8 ${
              showAnimatedSections
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0"
            }`}
          >
            {/* <InputFeint /> */}
            {/* <PnlGrowth /> */}
            <Morphing />
          </div>

          <div className="relative order-1 flex w-full flex-col items-center gap-5 border-neutral-900 pt-24 text-center lg:order-2 lg:w-[36%] lg:border-x lg:border-dashed lg:pt-24">
            {/* <Morphing /> */}
            {/* <Graph /> */}
            {/* <MultiStepComponent /> */}
            {/* <Logo /> */}
            <div className="w-full">
              <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center gap-8 pb-12">
                <div
                  className={`transition-all duration-700 ${
                    showAnimatedSections
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-2 opacity-0"
                  }`}
                ></div>
                <div
                  className={`transition-all duration-700 ${
                    showAnimatedSections
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-2 opacity-0"
                  }`}
                >
                  <AIInsights />
                </div>
                <div className="flex flex-col items-center gap-2 mb-5">
                  <div className="flex flex-col items-center gap-6">
                    <h1 className="text-4xl font-medium text-white md:text-4xl w-[450px]">
                      AI Native Trading Terminal For The Trenches
                    </h1>
                    {/* <p className="max-w-[480px] text-sm leading-6 text-neutral-400 md:text-[16px]">
                      AI-native platform for automated trading. Built for vibe
                      trenching. Snipe launches, copy whales, and automate
                      trades instantly.
                    </p> */}
                    <EmailCapture />
                    <p className="max-w-[520px] text-[12px] leading-5 text-neutral-500">
                      Early access is limited. Cryptocurrency trading carries
                      substantial risk of loss.
                    </p>
                  </div>
                </div>
                {/* <div
                  className={`transition-all duration-700 ${
                    showAnimatedSections
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-2 opacity-0"
                  }`}
                >
                  <AIInsights />
                </div> */}
              </div>
            </div>
            {/* <Graph /> */}
          </div>

          <div
            className={`order-3 flex w-full flex-col items-center justify-center py-12 transition-all duration-700 lg:order-3 lg:sticky lg:top-0 lg:h-screen lg:w-[32%] lg:pl-8 ${
              showAnimatedSections
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0"
            }`}
          >
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
