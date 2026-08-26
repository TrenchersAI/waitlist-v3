"use client";

import SiteNav from "./site-nav";
import {
  PreviewSection,
  ProblemSection,
  SolutionSection,
} from "./why-trenchersai";
import AiIcon from "../icons/ai-icon";
import CopyIcon from "../icons/copy-icon";
import SnipeIcon from "../icons/snipe-icon";
import TrackingIcon from "../icons/tracking-icon";

const START_TRADING_URL = "https://beta.trenchers.ai";

/** Items shown in the horizontal marquee above the headline. Source SVGs are
   drawn in black, so the wrapper's ⁠ [&_svg]:invert ⁠ flips them to white on
   the dark canvas. */
const FEATURE_STRIP_ITEMS = [
  { label: "Snipe New Launches", icon: <SnipeIcon /> },
  { label: "AI Trading Agents", icon: <AiIcon /> },
  { label: "Live Onchain Tracking", icon: <TrackingIcon /> },
  { label: "Copy Whales Trades", icon: <CopyIcon /> },
];

export default function Hero() {
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
          className="relative mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center px-5 pb-20 pt-32 text-center md:px-8 md:pt-40 md:pb-28"
        >
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

          <h1 className="mt-7 max-w-[min(1120px,100%)] text-balance text-[40px] font-medium leading-[1.04] tracking-[-0.02em] text-white sm:text-[56px] md:text-[68px]">
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
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-8 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Start trading
            </a>
          </div>
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
