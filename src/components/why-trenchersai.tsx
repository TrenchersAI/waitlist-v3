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

const LOOP_STEPS = [
  { src: "/feature_1.svg", label: "Describe what you want" },
  { src: "/feature_3.svg", label: "Fund the bot" },
  {
    src: "/feature_2.svg",
    label: "Let it run while you are asleep",
  },
] as const;

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
      <div className="mx-auto w-full max-w-[760px] px-5 py-24 text-center md:px-8 md:py-32">
        <motion.div className="flex flex-col items-center gap-6" {...reveal}>
          <Eyebrow>The problem</Eyebrow>
          <h2 className="text-balance text-[30px] font-medium leading-[1.1] tracking-[-0.02em] text-white md:text-[42px]">
            The trenches are already automated
          </h2>
          <p className="max-w-[60ch] text-balance text-[15px] leading-[1.7] text-white/65 md:text-[17px]">
            You are not just competing with other traders anymore. You are
            competing with bots, private infra, faster execution, and wallets
            that react before CT even notices.
          </p>
        </motion.div>

        <motion.div
          className="mt-20 flex flex-col items-center gap-6 md:mt-24"
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.05 }}
        >
          <h3 className="text-balance text-[24px] font-medium leading-[1.15] tracking-[-0.015em] text-white md:text-[32px]">
            Advanced trading is still too hard to use
          </h3>

          <div className="flex max-w-[60ch] flex-col gap-4 text-[15px] leading-[1.7] text-white/65 md:text-[17px]">
            <p>
              The best traders have automation, fast execution, private infra,
              and custom bots.
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
          className="mt-20 text-balance text-[16px] font-semibold leading-[1.4] tracking-[-0.01em] text-white md:mt-24 md:text-[19px]"
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.1 }}
        >
          TrenchersAI makes pro-level trading tools feel simple.
        </motion.p>
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
      <div className="mx-auto w-full max-w-[1480px] px-5 py-24 text-center md:px-8 md:py-32">
        <motion.div className="flex flex-col items-center gap-6" {...reveal}>
          <Eyebrow>What changes with TrenchersAI</Eyebrow>
          <h2 className="text-balance text-[30px] font-medium leading-[1.1] tracking-[-0.02em] text-white md:text-[42px]">
            One terminal. Spawnable AI agents. Full control.
          </h2>
          <p className="max-w-[60ch] text-balance text-[15px] leading-[1.7] text-white/65 md:text-[17px]">
            TrenchersAI gives traders one place to discover, snipe, copy, track,
            and manage positions with AI agents built directly into the
            terminal.
          </p>
        </motion.div>

        <motion.div
          className="mt-16 flex w-full flex-col items-center md:mt-20"
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.05 }}
        >
          <p className="font-mono text-[12px] tracking-[0.16em] text-white/35 uppercase">
            The loop
          </p>
          <div className="mt-6 mx-auto grid w-max max-w-full grid-cols-1 justify-items-center gap-12 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
            {LOOP_STEPS.map((step) => (
              <div
                key={step.src}
                className="flex min-w-0 flex-col items-center gap-4 text-center"
              >
                <div className="relative mx-auto h-[360px] w-[360px] shrink-0 lg:h-[440px] lg:w-[440px]">
                  <Image
                    src={step.src}
                    alt=""
                    fill
                    className="object-contain border border-neutral-800 rounded-lg"
                    sizes="(min-width: 1024px) 440px, 360px"
                  />
                </div>
                <p className="max-w-[28ch] text-balance text-[15px] font-medium leading-[1.45] tracking-[-0.01em] text-white md:text-[16px]">
                  {step.label}
                </p>
              </div>
            ))}
          </div>
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
      <div className="mx-auto w-full max-w-[1180px] px-5 py-24 md:px-8 md:py-32">
        <motion.header
          className="mx-auto flex max-w-[760px] flex-col items-center gap-5 text-center"
          {...reveal}
        >
          <Eyebrow>Inside the terminal</Eyebrow>
          <h2 className="text-balance text-[30px] font-medium leading-[1.08] tracking-[-0.02em] text-white md:text-[42px]">
            The pro terminal traders know.
          </h2>
          <h3 className="text-balance text-[22px] font-medium leading-[1.1] tracking-[-0.015em] text-white/85 md:text-[30px]">
            But with AI.
          </h3>

          <div className="mt-2 flex max-w-[62ch] flex-col gap-4 text-[15px] leading-[1.7] text-white/65 md:text-[17px]">
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

          <div className="mt-4 flex flex-col gap-1 text-[15px] font-medium leading-[1.55] text-white md:text-[17px]">
            <p>Manual when you want control</p>
            <p>AI-assisted when you want speed.</p>
            <p>Delegated when you want the agent to handle the setup.</p>
          </div>
        </motion.header>

        <motion.div
          className="mt-14 overflow-hidden rounded-2xl border border-white/8 bg-[#0a0a0c] shadow-[0_30px_120px_-20px_rgba(94,104,255,0.22)] md:mt-20"
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.05 }}
        >
          {/* Window chrome */}
          <div className="flex items-center justify-between border-b border-white/6 bg-white/2 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            </div>
            <div className="font-mono text-[10.5px] tracking-[0.18em] text-white/30 uppercase">
              trenchers.ai / terminal
            </div>
            <span aria-hidden className="h-2.5 w-12" />
          </div>

          {/* Scrollable preview. Keeps the full UI legible on small viewports
             while desktop sees the whole frame at once. */}
          <div className="relative w-full overflow-x-auto scrollbar-minimal-black">
            <div className="min-w-[960px]">
              <Image
                src="/showcase/terminal-left.png"
                alt="TrenchersAI terminal preview"
                width={1920}
                height={1080}
                sizes="(min-width: 1180px) 1100px, 100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
