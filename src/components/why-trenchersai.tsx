"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

import logoMark from "./icons/logo-mark.svg";
import { ChatPreview } from "./product/chat-preview";
import { FirstTradePreview } from "./product/first-trade-preview";
import { FundPreview } from "./product/fund-preview";
import { GoLivePreview } from "./product/go-live-preview";
import { RunPreview } from "./product/run-preview";
import { TerminalDemo } from "./product/terminal-demo/terminal-demo";
/** Shared scroll-reveal preset used by every section block below. Lower
   threshold + bottom margin so each section fades in just before it enters
   the viewport. Keeps the page feeling continuous instead of "wait,
   then pop". */
const reveal = {
  initial: { opacity: 0, y: 18 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: {
    once: true,
    amount: 0.18,
    margin: "0px 0px 12% 0px",
  } as const,
  transition: { duration: 0.5, ease: "easeOut" as const },
};

type LoopStep = {
  label: string;
  /** Live product UI, ported from trenchers_fe (`src/components/product`). */
  visual: ReactNode;
};

const LOOP_STEPS: LoopStep[] = [
  { label: "Describe what you want", visual: <ChatPreview /> },
  { label: "Fund the bot", visual: <FundPreview /> },
  { label: "Let it run while you are asleep", visual: <RunPreview /> },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-white/45 uppercase">
      <span aria-hidden className="h-px w-6 bg-white/15" />
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------------- */
/* Section 2: Solution                                                      */
/* ----------------------------------------------------------------------- */

export function SolutionSection() {
  return (
    <section className="site-canvas-bg relative w-full border-t border-white/6">
      <div className="mx-auto w-full max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <motion.div
          className="mx-auto flex w-full max-w-6xl flex-col gap-8 rounded-2xl border border-white/8 bg-white/4 px-6 py-8 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.85)] sm:px-7 sm:py-9 md:gap-10 md:px-8 md:py-10 lg:flex-row lg:items-stretch lg:gap-0 lg:px-8 lg:py-10"
          {...reveal}
        >
          <div className="flex min-w-0 flex-1 flex-col items-start gap-5 text-left md:gap-6 lg:pr-5">
            <h2 className="text-balance text-[26px] font-medium leading-[1.08] tracking-[-0.02em] text-white sm:text-[32px] md:text-[36px] lg:text-[40px]">
              One terminal. Spawnable AI agents. Full control.
            </h2>
            <p className="max-w-full text-balance text-[14px] leading-[1.72] text-white/55 md:text-[16px]">
              TrenchersAI gives traders one place to discover, snipe, copy,
              track, and manage positions with AI agents built directly into the
              terminal.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="mt-3 w-full"
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.05 }}
        >
          <div className="mt-0 mx-auto grid w-full max-w-6xl grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-2">
            {LOOP_STEPS.map((step, index) => (
              <div
                key={step.label}
                className={index === 2 ? "min-w-0 lg:col-span-2" : "min-w-0"}
              >
                <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/4 p-3 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.85)] sm:p-4">
                  <div
                    className={
                      index === 2
                        ? "relative flex w-full min-h-[320px] min-w-0 items-center justify-center overflow-hidden rounded-xl bg-black/35 px-4 py-8 ring-1 ring-inset ring-white/6 sm:min-h-[400px] sm:px-8"
                        : "relative flex aspect-16/10 w-full min-h-[320px] min-w-0 items-center justify-center overflow-hidden rounded-xl bg-black/35 p-4 ring-1 ring-inset ring-white/6 sm:min-h-[400px] sm:p-6 lg:min-h-[480px]"
                    }
                  >
                    {step.visual}
                  </div>
                  <p className="mt-3 px-1 text-left text-[14px] font-medium leading-snug tracking-[-0.01em] text-white sm:text-[15px] md:mt-4 md:text-[16px]">
                    {step.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------- */
/* Section 3: Paper to live                                                 */
/* ----------------------------------------------------------------------- */

type SectionStep = { title: string; body: string };

function SectionSteps({ steps }: { steps: readonly SectionStep[] }) {
  return (
    <ol className="flex flex-col gap-5">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-4">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/4 text-[12px] font-medium tabular-nums text-white/70">
            {i + 1}
          </span>
          <div className="min-w-0">
            <h3 className="text-[15px] font-medium leading-snug text-white md:text-[16px]">
              {step.title}
            </h3>
            <p className="mt-1 text-pretty text-[14px] leading-[1.6] text-white/55">
              {step.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const FIRST_TRADE_STEPS = [
  {
    title: "Scans every launch",
    body: "New tokens, the moment they appear.",
  },
  {
    title: "Checks every gate",
    body: "Holders, liquidity, dev, snipers.",
  },
  {
    title: "Buys when all pass",
    body: "Your first trade, no clicks needed.",
  },
] as const;

export function FirstTradeSection() {
  return (
    <section className="site-canvas-bg relative w-full border-t border-white/6">
      <div className="mx-auto w-full max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <motion.div
          className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
          {...reveal}
        >
          <div className="flex min-w-0 flex-col gap-8 rounded-2xl border border-white/8 bg-white/4 px-6 py-8 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.85)] sm:px-7 sm:py-9 md:px-8 md:py-10 lg:order-2">
            <div className="flex flex-col items-start gap-5 text-left md:gap-6">
              <Eyebrow>First trade</Eyebrow>
              <h2 className="text-balance text-[26px] font-medium leading-[1.08] tracking-[-0.02em] text-white sm:text-[32px] md:text-[36px] lg:text-[40px]">
                Watch it hunt for its first trade.
              </h2>
              <p className="text-balance text-[14px] leading-[1.72] text-white/55 md:text-[16px]">
                Every new launch is checked against your rules.
              </p>
            </div>
            <SectionSteps steps={FIRST_TRADE_STEPS} />
          </div>

          <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/4 p-3 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.85)] sm:p-4 lg:order-1">
            <div className="relative flex w-full min-w-0 flex-1 items-center overflow-hidden rounded-xl bg-black/35 px-3 py-5 ring-1 ring-inset ring-white/6 sm:px-5 sm:py-6">
              <FirstTradePreview />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const GO_LIVE_STEPS = [
  {
    title: "Prove it on paper",
    body: "Simulated SOL, zero risk.",
  },
  {
    title: "Go live on purpose",
    body: "One confirm clones it to a live agent.",
  },
  {
    title: "Its own wallet, your cap",
    body: "It only trades what you fund.",
  },
] as const;

export function GoLiveSection() {
  return (
    <section className="site-canvas-bg relative w-full border-t border-white/6">
      <div className="mx-auto w-full max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <motion.div
          className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
          {...reveal}
        >
          <div className="flex min-w-0 flex-col gap-8 rounded-2xl border border-white/8 bg-white/4 px-6 py-8 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.85)] sm:px-7 sm:py-9 md:px-8 md:py-10">
            <div className="flex flex-col items-start gap-5 text-left md:gap-6">
              <Eyebrow>Paper to live</Eyebrow>
              <h2 className="text-balance text-[26px] font-medium leading-[1.08] tracking-[-0.02em] text-white sm:text-[32px] md:text-[36px] lg:text-[40px]">
                Paper first. Live when you are ready.
              </h2>
              <p className="text-balance text-[14px] leading-[1.72] text-white/55 md:text-[16px]">
                Test with simulated SOL, then promote when you trust it.
              </p>
            </div>

            <SectionSteps steps={GO_LIVE_STEPS} />
          </div>

          <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/4 p-3 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.85)] sm:p-4">
            <div className="relative flex w-full min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-black/35 px-2 py-6 ring-1 ring-inset ring-white/6 sm:px-8 sm:py-8">
              <GoLivePreview />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


export function TerminalSection() {
  return (
    <section className="site-canvas-bg relative w-full overflow-hidden border-t border-white/6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[80%] bg-[radial-gradient(150%_100%_at_50%_100%,rgba(178,180,186,0.62)_0%,rgba(120,122,128,0.36)_30%,rgba(60,61,65,0.16)_55%,rgba(10,10,10,0)_80%)]"
      />
      <div className="relative mx-auto w-full max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <motion.div className="flex flex-col gap-10 md:gap-12" {...reveal}>
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center md:gap-6">
            <h2 className="text-balance text-[26px] font-medium leading-[1.08] tracking-[-0.02em] text-white sm:text-[32px] md:text-[36px] lg:text-[40px]">
              Or take the wheel yourself.
            </h2>
            <p className="text-balance text-[14px] leading-[1.72] text-white/55 md:text-[16px]">
              The same terminal gives you charts, instant buys and limit orders
              on any Solana token.
            </p>
          </div>

          <div className="relative min-w-0 overflow-hidden rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_2px_4px_rgba(0,0,0,0.35),0_10px_24px_-8px_rgba(0,0,0,0.5)] after:pointer-events-none after:absolute after:inset-0 after:rounded-xl after:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <TerminalDemo />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
