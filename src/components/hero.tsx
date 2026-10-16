"use client";

import dynamic from "next/dynamic";

import SiteNav from "./site-nav";
import {
  FirstTradeSection,
  GoLiveSection,
  SolutionSection,
  TerminalSection,
} from "./why-trenchersai";

const START_TRADING_URL = "https://trenchers.ai";

/** Gradient Waves is a WebGL2 canvas. Load it client-only so it never runs
   during SSR/prerender. */
const GradientWaves = dynamic(() => import("./GradientWaves"), { ssr: false });

export default function Hero() {
  return (
    <>
      <SiteNav />

      <section
        id="hero"
        className="site-canvas-bg relative flex min-h-dvh w-full items-center justify-center overflow-hidden"
      >
        {/* Gradient Waves (reactbits.dev). Pointer events stay on the copy. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <GradientWaves
            waveColor="#38bdf8"
            amplitude={1.8}
            swell={25}
            lightAngle={150}
            speed={0.5}
          />
        </div>

        <div
          id="waitlist"
          className="relative z-10 mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center px-5 py-28 text-center md:px-8"
        >
          <h1 className="max-w-[min(1120px,100%)] text-balance text-[40px] font-medium leading-[1.04] tracking-[-0.02em] text-white sm:text-[56px] md:text-[68px]">
            <span className="block">Build your own strategy.</span>
            <span className="mt-2 block text-white/55 sm:mt-2.5 md:mt-3">
              Let an agent trade it.
            </span>
          </h1>

          <p className="mt-7 max-w-[640px] text-balance text-[15px] leading-[1.65] text-white/55 sm:mt-8 sm:text-[17px] md:text-[18px]">
            Configure an AI trading agent your way and paper trade it first.
            When it works, go live on Solana. Discover, snipe, and track
            wallets from the same terminal.
          </p>

          <div className="mt-10 flex w-full justify-center md:mt-11">
            <a
              href={START_TRADING_URL}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-8 text-base font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Start trading
            </a>
          </div>
        </div>
      </section>

      <>
        <TerminalSection />
        <SolutionSection />
        <FirstTradeSection />
        <GoLiveSection />
      </>
    </>
  );
}
