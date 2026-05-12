"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion } from "motion/react";

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

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-white/45 uppercase">
      <span aria-hidden className="h-px w-6 bg-white/15" />
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------------- */
/* Section 1: Problem                                                       */
/* ----------------------------------------------------------------------- */

export function ProblemSection() {
  return (
    <section className="site-canvas-bg relative w-full border-t border-white/6">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-6 md:px-8 md:py-28">
        <motion.div
          className="grid gap-10 md:gap-12 lg:grid-cols-12 lg:gap-16"
          {...reveal}
        >
          <div className="flex flex-col items-start gap-6 text-left lg:col-span-5">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="text-balance text-[30px] font-medium leading-[1.08] tracking-[-0.02em] text-white md:text-[40px] lg:text-[44px]">
              The trenches are already automated
            </h2>
            <p className="max-w-[60ch] text-balance text-[15px] leading-[1.72] text-white/65 md:text-[17px]">
              You are not just competing with other traders anymore. You are
              competing with bots, private infra, faster execution, and wallets
              that react before CT even notices.
            </p>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-7">
            <motion.div
              className="rounded-2xl border border-white/8 bg-white/3 p-6 md:p-8"
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.05 }}
            >
              <h3 className="text-balance text-[24px] font-medium leading-[1.14] tracking-[-0.015em] text-white md:text-[32px]">
                Advanced trading is still too hard to use
              </h3>

              <div className="mt-5 flex max-w-[60ch] flex-col gap-4 text-[15px] leading-[1.7] text-white/65 md:text-[17px]">
                <p>
                  The best traders have automation, fast execution, private
                  infra, and custom bots.
                </p>
                <p>
                  Most trenchers have tabs, wallet popups, Telegram commands,
                  confusing dashboards, and a brutal learning curve.
                </p>
                <p>The edge is there.</p>
                <p>The onboarding is broken.</p>
              </div>
            </motion.div>

            <motion.p
              className="rounded-xl border border-[#8C95FF]/35 bg-[#8C95FF]/10 px-5 py-4 text-balance text-[16px] font-semibold leading-[1.45] tracking-[-0.01em] text-white md:px-6 md:py-5 md:text-[19px]"
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.1 }}
            >
              TrenchersAI makes pro-level trading tools feel simple.
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------- */
/* Section 2: Solution                                                      */
/* ----------------------------------------------------------------------- */

export function SolutionSection() {
  return (
    <section className="site-canvas-bg relative w-full border-t border-white/6">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-6 md:px-8 md:py-28">
        <motion.div
          className="mx-auto flex w-full max-w-[980px] flex-col items-center rounded-[28px] border border-white/8 bg-white/2 px-6 py-10 text-center shadow-[0_40px_120px_-52px_rgba(94,104,255,0.65)] md:px-10 md:py-14"
          {...reveal}
        >
          <Eyebrow>What changes with TrenchersAI</Eyebrow>
          <h2 className="mt-5 text-balance text-[30px] font-medium leading-[1.08] tracking-[-0.02em] text-white md:text-[42px]">
            One terminal. Spawnable AI agents. Full control.
          </h2>
          <p className="mt-5 max-w-[60ch] text-balance text-[15px] leading-[1.7] text-white/65 md:text-[17px]">
            TrenchersAI gives traders one place to discover, snipe, copy, track,
            and manage positions with AI agents built directly into the terminal.
          </p>

          <motion.div
            className="mt-9 inline-flex flex-col items-center gap-2 self-center rounded-full border border-[#8C95FF]/35 bg-[#8C95FF]/10 px-5 py-3 md:mt-12 md:px-7"
            {...reveal}
            transition={{ ...reveal.transition, delay: 0.05 }}
          >
            <p className="font-mono text-[11px] tracking-[0.16em] text-white/40 uppercase">
              The loop
            </p>
            <p className="text-balance text-[15px] font-medium leading-[1.55] tracking-[-0.01em] text-white md:text-[19px]">
              Describe what you want &rsaquo; Fund the bot &rsaquo; Let it run
              while you are asleep
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------- */
/* Section 3: Product preview                                               */
/* ----------------------------------------------------------------------- */

export function PreviewSection() {
  return (
    <section className="site-canvas-bg relative w-full border-t border-white/6">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-6 md:px-8 md:py-28">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
          <motion.div
            className="flex flex-col gap-5 rounded-[24px] border border-white/8 bg-white/2 px-6 py-8 text-left md:px-8 md:py-9 lg:col-span-5"
            {...reveal}
          >
            <Eyebrow>Inside the terminal</Eyebrow>
            <h2 className="text-balance text-[30px] font-medium leading-[1.08] tracking-[-0.02em] text-white md:text-[40px]">
              The pro terminal traders know.
            </h2>
            <h3 className="text-balance text-[22px] font-medium leading-[1.1] tracking-[-0.015em] text-white/85 md:text-[30px]">
              But with AI.
            </h3>

            <div className="mt-1 flex flex-col gap-4 text-[15px] leading-[1.7] text-white/65 md:text-[17px]">
              <p>
                TrenchersAI brings the tools traders already use across the
                trenches into one terminal: sniping, copy trading, whale tracking,
                charts, watchlists, position management, and fast execution.
              </p>
              <p>
                Then it adds the missing layer: AI agents that help configure and
                run bots without turning the product into a black box.
              </p>
            </div>

            <div className="mt-2 flex flex-col gap-2 rounded-xl border border-white/8 bg-black/25 p-4 text-[15px] font-medium leading-[1.55] text-white md:text-[17px]">
              <p>Manual when you want control</p>
              <p>AI-assisted when you want speed.</p>
              <p>Delegated when you want the agent to handle the setup.</p>
            </div>
          </motion.div>

          <motion.div
            className="lg:col-span-7"
            {...reveal}
            transition={{ ...reveal.transition, delay: 0.05 }}
          >
            <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-white/40 uppercase">
              TrenchersAI terminal preview
            </p>
            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#08090b] p-2 shadow-[0_30px_120px_-20px_rgba(94,104,255,0.3)]">
              <Image
                src="/image.png"
                alt="TrenchersAI terminal preview"
                width={1854}
                height={925}
                sizes="(min-width: 1280px) 760px, 100vw"
                unoptimized
                className="h-auto w-full rounded-[18px]"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
