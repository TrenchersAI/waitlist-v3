"use client";

import Image from "next/image";
import SiteNav from "./site-nav";
import styles from "./hero-background.module.css";
import {
  PreviewSection,
  ProblemSection,
  SolutionSection,
} from "./why-trenchersai";

const START_TRADING_URL = "https://trenchers.ai";

export default function Hero() {
  return (
    <>
      <SiteNav />

      <section
        id="hero"
        className="site-canvas-bg relative isolate flex min-h-[max(760px,100dvh)] w-full items-center justify-center overflow-hidden md:min-h-dvh"
      >
        <div className={styles.heroBackground} aria-hidden="true">
          <Image
            src="/hero-comet-night-v2.webp"
            alt=""
            fill
            preload
            unoptimized
            className={styles.heroArtwork}
          />
        </div>

        <div
          id="waitlist"
          className="relative z-10 mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center px-5 py-28 text-center md:px-8"
        >
          <h1 className="max-w-[min(1120px,100%)] text-balance text-[40px] font-medium leading-[1.04] tracking-[-0.02em] text-white sm:text-[56px] md:text-[68px]">
            <span className="block">AI-Native Trading Terminal,</span>
            <span className="mt-2 block text-white/55 sm:mt-2.5 md:mt-3">
              Made For The Trenches.
            </span>
          </h1>

          <p className="mt-7 max-w-[640px] text-balance text-[15px] leading-[1.65] text-white/55 sm:mt-8 sm:text-[17px] md:text-[18px]">
            Spawn AI trading agents from chat. Discover, snipe, copy, track,
            and manage positions, all from one terminal built for speed.
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
        <SolutionSection />
        <ProblemSection />
        <PreviewSection />
      </>
    </>
  );
}
