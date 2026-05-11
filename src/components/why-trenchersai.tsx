"use client";

import { motion } from "motion/react";

export default function AboutUs() {
  return (
    <section className="relative min-h-screen w-full bg-[#0a0a0a] bg-[linear-gradient(rgb(0_0_0/var(--bg-noise-overlay-opacity)),rgb(0_0_0/var(--bg-noise-overlay-opacity))),url('/bg.svg')] bg-cover bg-center bg-no-repeat">
      <main className="mx-auto flex items-center justify-center min-h-screen w-full max-w-2xl flex-col gap-12 px-6 py-24 text-left">
        <motion.section
          className="flex w-full flex-col gap-16 md:gap-24"
          initial={{ opacity: 0, y: 28, filter: "blur(12px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 text-center md:max-w-2xl md:gap-6">
            <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              The trenches are already automated
            </h2>
            <p className="text-[15px] leading-7 text-neutral-400 md:text-[16px]">
              You are not just competing with other traders anymore. You are
              competing with bots, private infra, faster execution, and wallets
              that react before CT even notices.
            </p>
          </div>

          <div className="w-full text-left">
            <h3 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Advanced trading is still too hard to use
            </h3>
            <div className="mt-10 flex flex-col gap-8 text-[15px] font-normal leading-7 text-neutral-400 md:mt-12 md:gap-10 md:text-[16px]">
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
          </div>

          <p className="text-[16px] leading-7 text-white text-center">
            TrenchersAI makes pro-level trading tools feel simple
          </p>
        </motion.section>

        <motion.section
          className="flex w-full flex-col items-center gap-8 pb-12 text-center md:gap-10"
          aria-labelledby="what-changes-heading"
          initial={{ opacity: 0, y: 28, filter: "blur(12px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.08 }}
        >
          <h2 id="what-changes-heading" className="sr-only">
            What changes with TrenchersAI
          </h2>
          <p className="max-w-5xl text-2xl font-semibold leading-snug tracking-tight text-white md:text-3xl md:leading-tight">
            One terminal. Spawnable AI agents. Full control.
          </p>
          <p className="max-w-xl text-[15px] font-normal leading-7 text-white md:text-lg md:leading-8">
            TrenchersAI gives traders one place to discover, snipe, copy, track,
            and manage positions — with AI agents built directly into the
            terminal.
          </p>
          <p className="max-w-2xl text-sm font-normal leading-6 text-white md:text-base md:leading-7">
            Describe what you want {">"} Fund the bot {">"} Let it run while you
            are asleep
          </p>
        </motion.section>
      </main>
    </section>
  );
}
