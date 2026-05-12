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
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-6 md:px-8 md:py-28">
        <motion.div
          className="relative flex flex-col gap-6 overflow-hidden rounded-[24px] bg-[linear-gradient(160deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.05)_58%,rgba(140,149,255,0.1)_100%)] px-6 py-8 text-left shadow-[0_18px_50px_-35px_rgba(0,0,0,0.7)] md:px-8 md:py-9 lg:px-9"
          {...reveal}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#8C95FF]/12 blur-3xl"
          />
          <div className="-mx-6 -mt-8 mb-1 flex items-center justify-between bg-black/10 px-6 py-3 md:-mx-8 md:-mt-9 md:px-8 lg:-mx-9 lg:px-9">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            </div>
            <span className="text-[10.5px] font-semibold tracking-[0.18em] text-white/45 uppercase">
              Inside the terminal
            </span>
            <span aria-hidden className="h-2.5 w-10" />
          </div>
          <h2 className="max-w-[18ch] text-balance text-[32px] font-medium leading-[1.08] tracking-tight text-white md:text-[44px]">
            The pro terminal traders know.
          </h2>
          <h3 className="text-balance text-[24px] font-medium leading-[1.12] tracking-tight text-[#C5CBFF] md:text-[32px]">
            But with AI.
          </h3>

          <div className="mt-1 flex max-w-[64ch] flex-col gap-4 text-[15px] leading-[1.72] text-white/72 md:text-[17px]">
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

          <div className="mt-1 flex flex-col gap-2 rounded-xl bg-white/4 p-4 text-[15px] font-medium leading-[1.55] text-white/92 md:p-5 md:text-[17px]">
            <p className="flex items-start gap-2.5">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-white/65" />
              <span>Manual when you want control</span>
            </p>
            <p className="flex items-start gap-2.5">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-white/65" />
              <span>AI-assisted when you want speed.</span>
            </p>
            <p className="flex items-start gap-2.5">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-white/65" />
              <span>Delegated when you want the agent to handle the setup.</span>
            </p>
          </div>
        </motion.div>

        <motion.div
          className="group relative mt-8 overflow-hidden rounded-[24px] border border-white/12 bg-[#07080a] p-2 shadow-[0_30px_120px_-20px_rgba(94,104,255,0.32)] ring-1 ring-inset ring-white/5 md:mt-10"
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.05 }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_100%,rgba(94,104,255,0.22),transparent_72%)]"
          />
          <div className="relative overflow-hidden rounded-[18px] border border-white/8 bg-black/30">
            <div className="aspect-21/9 w-full">
              <Image
                src="/image.png"
                alt="TrenchersAI terminal preview"
                width={1854}
                height={925}
                sizes="(min-width: 1280px) 1100px, 100vw"
                unoptimized
                className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
