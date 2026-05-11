"use client";

import { motion } from "motion/react";

export default function AboutUs() {
  return (
    <section className="relative min-h-screen w-full bg-[#0a0a0a] bg-[linear-gradient(rgb(0_0_0_/_var(--bg-noise-overlay-opacity)),rgb(0_0_0_/_var(--bg-noise-overlay-opacity))),url('/bg.svg')] bg-cover bg-center bg-no-repeat">
      <main className="mx-auto flex items-center justify-center min-h-screen w-full max-w-2xl flex-col gap-12 px-6 py-24 text-left">
        <motion.section
          className="flex flex-col gap-4"
          initial={{ opacity: 0, y: 28, filter: "blur(12px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <h2 className="text-xl font-medium text-white md:text-2xl">
            Challenges
          </h2>
          <p className="text-[16px] leading-7 text-neutral-500">
            The trenches are already automated. You are not just competing with
            other traders anymore. You are competing with infra, faster
            execution, and wallets that react before CT even notices. Advanced
            trading is still too hard to use. The best traders have automation,
            fast execution, private infra, and bots. Most trenches have tabs,
            wallet popups, telegram commands, confusing dashboards, and a brutal
            learning curve. The edge is there. The onboarding is broken.
          </p>
        </motion.section>

        <motion.section
          className="flex flex-col gap-4 pb-12"
          initial={{ opacity: 0, y: 28, filter: "blur(12px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.08 }}
        >
          <h2 className="text-xl font-medium text-white md:text-2xl">
            What changes with TrenchersAI
          </h2>
          <p className="text-[16px] leading-7 text-neutral-500">
            One terminal. Spawnable AI agents. Full control. TrenchersAI gives
            traders one place to discover, snipe, copy, track, and manage
            positions with AI agents built directly into the terminal. Describe
            what you want &gt; Fund the bot &gt; Let it run while you are
            asleep.
          </p>
        </motion.section>
      </main>
    </section>
  );
}
