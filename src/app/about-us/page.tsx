"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import logoMark from "@/src/components/icons/logo-mark.svg";

export default function AboutUsPage() {
  return (
    <section className="relative min-h-screen w-full min-w-0">
      <nav className="absolute left-0 right-0 top-0 z-30 mx-auto flex w-full max-w-7xl items-center justify-between border-b border-white/10 bg-black px-4 py-5 md:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <Image
            src={logoMark}
            alt="Trenchersai logo"
            width={28}
            height={25}
            priority
          />
          <span className="text-lg tracking-wide text-white">TrenchersAI</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-white/70">
          <Link href="/" className="transition-colors hover:text-white">
            Home
          </Link>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white"
          >
            X
          </a>
          <a
            href="https://t.me"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white"
          >
            Telegram
          </a>
          <a
            href="https://discord.com"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white"
          >
            Discord
          </a>
        </div>
      </nav>

      <main className="mx-auto flex min-h-screen w-full min-w-0 max-w-2xl flex-col items-center justify-center gap-12 px-4 py-24 text-left md:px-6 lg:px-6">
        <motion.section
          className="flex w-full min-w-0 flex-col gap-4"
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
          className="flex w-full min-w-0 flex-col gap-4 pb-12"
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
