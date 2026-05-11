"use client";

import { motion } from "motion/react";
import { BorderBeam } from "border-beam";

const reveal = {
  initial: { opacity: 0, y: 24, filter: "blur(10px)" } as const,
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" } as const,
  viewport: { once: true, amount: 0.35 } as const,
  transition: { duration: 0.65, ease: "easeOut" as const },
};

export default function AboutUs() {
  return (
    <section className="relative h-screen flex items-center justify-center w-full bg-[#0a0a0a] bg-[linear-gradient(rgb(0_0_0/var(--bg-noise-overlay-opacity)),rgb(0_0_0/var(--bg-noise-overlay-opacity))),url('/bg.svg')] bg-cover bg-center bg-no-repeat">
      <main className="mx-auto rounded-xl flex w-full max-w-[600px] flex-col gap-16 px-6 py-20 text-left md:gap-20 md:py-8">
        <BorderBeam
          size="sm"
          theme="dark"
          colorVariant="ocean"
          duration={2.4}
          strength={0.68}
          borderRadius={12}
          className="relative w-full rounded-xl"
        >
          <motion.section
            className="relative flex flex-col gap-4 rounded-xl bg-[#121212] px-6 pt-6 pb-16 md:gap-5"
            {...reveal}
          >
            <h2 className="text-[16px] font-semibold text-white md:text-xl">
              Challenges
            </h2>
            <p className="text-[14px] font-normal leading-7 text-neutral-400 md:text-[16px]">
              The trenches are already automated. You are not just competing
              with other traders anymore. You are competing with infra, faster
              execution, and wallets that react before CT even notices. Advanced
              trading is still too hard to use. The best traders have
              automation, fast execution, private infra, and bots. Most trenches
              have tabs, wallet popups, telegram commands, confusing dashboards,
              and a brutal learning curve. The edge is there. The onboarding is
              broken.
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-22 bg-linear-to-t from-black to-transparent" />
          </motion.section>
        </BorderBeam>

        <BorderBeam
          size="sm"
          theme="dark"
          colorVariant="ocean"
          duration={2.4}
          strength={0.68}
          borderRadius={12}
          className="relative w-full rounded-xl"
        >
          <motion.section
            className="relative flex flex-col gap-4 rounded-xl bg-[#121212] px-6 pt-6 pb-16 md:gap-5 md:pb-12"
            {...reveal}
            transition={{ ...reveal.transition, delay: 0.06 }}
          >
            <h2 className="text-[16px] font-semibold text-white md:text-xl">
              What changes with TrenchersAI
            </h2>
            <p className="text-[14px] font-normal leading-7 text-neutral-400 md:text-[16px]">
              One terminal. Spawnable AI agents. Full control. TrenchersAI gives
              traders one place to discover, snipe, copy, track, and manage
              positions with AI agents built directly into the terminal.
              Describe what you want {">"} Fund the bot {">"} Let it run while
              you are asleep.
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-22 bg-linear-to-t from-black to-transparent" />
          </motion.section>
        </BorderBeam>
        {/* <div className="h-32 gra"></div> */}
      </main>
    </section>
  );
}
