"use client";

import dynamic from "next/dynamic";

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

/** Beams renders a WebGL `<Canvas>` (three.js / react-three-fiber), which needs
   browser APIs. Load it client-only so it never runs during SSR/prerender. */
const Beams = dynamic(() => import("./Beams"), { ssr: false });

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
        className="site-canvas-bg relative flex min-h-dvh w-full items-center justify-center overflow-hidden"
      >
        {/* Animated Beams background. The canvas is transparent
           (`backgroundColor={null}`) so the dark site canvas shows through. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Beams
            beamWidth={3}
            beamHeight={30}
            beamNumber={20}
            speed={3}
            noiseIntensity={1.75}
            scale={0.2}
            rotation={30}
            backgroundColor={null}
          />
        </div>

        <div
          id="waitlist"
          className="relative z-10 mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center px-5 py-28 text-center md:px-8"
        >
          <div className="feature-strip-marquee mb-1 w-full max-w-[640px]">
            {/* Items duplicated 4x so the track always spans wider than
               any viewport. Keyframes translate -50% (i.e. 2 of the 4
               sets), so the second half lands exactly where the first
               half started - seamless infinite loop. */}
            <div className="feature-strip-track">
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
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-8 text-base font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
