"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

type Feature = {
  title: string;
  description: string;
  icon: ReactNode;
};

const ICON_CLASS = "size-[18px] shrink-0 stroke-[1.4] text-[#8C95FF]";

function IconChat() {
  return (
    <svg
      className={ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 0 1-4-.8L3 21l1.8-4.2A8.96 8.96 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg
      className={ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg
      className={ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M3 9h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H3" />
      <path d="M16 14h.01" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg
      className={ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path d="m12.83 2.18 8 3.64a1 1 0 0 1 0 1.82l-8 3.64a2 2 0 0 1-.83 0l-8-3.64a1 1 0 0 1 0-1.82l8-3.64a2 2 0 0 1 .83 0Z" />
      <path d="M2.82 11.77 12 15.35l9.18-3.58" />
      <path d="M2.82 16.77 12 20.35l9.18-3.58" />
    </svg>
  );
}

function IconPercent() {
  return (
    <svg
      className={ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path d="M19 5 5 19" />
      <circle cx="7.5" cy="7.5" r="2" />
      <circle cx="16.5" cy="16.5" r="2" />
    </svg>
  );
}

function IconGift() {
  return (
    <svg
      className={ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path d="M20 12v8H4v-8" />
      <path d="M2 7h20v5H2z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z" />
    </svg>
  );
}

const FEATURES: Feature[] = [
  {
    title: "Spawn sniper bots from chat",
    description:
      "No coding, no messy setup. Describe a strategy and confirm the plan.",
    icon: <IconChat />,
  },
  {
    title: "Sub-millisecond signing",
    description: "Built for speed when milliseconds matter.",
    icon: <IconBolt />,
  },
  {
    title: "One bot, one wallet",
    description: "Each bot gets its own wallet. Risk only what you fund.",
    icon: <IconWallet />,
  },
  {
    title: "Same engine for everyone",
    description: "No premium feature gates. Trade more, pay less.",
    icon: <IconLayers />,
  },
  {
    title: "Lower fees",
    description:
      "Competitors charge ~0.9–1% per swap. TrenchersAI is built to charge less.",
    icon: <IconPercent />,
  },
  {
    title: "Trader rewards",
    description: "Active traders earn back instead of just paying fees forever.",
    icon: <IconGift />,
  },
];

export default function TrenchersFeaturesGrid() {
  return (
    <section className="site-canvas-bg relative w-full border-t border-white/6">
      <div className="mx-auto w-full min-w-0 max-w-[1100px] px-5 py-24 md:px-8 md:py-32">
        <motion.header
          className="mx-auto flex w-full min-w-0 max-w-[720px] flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-white/45 uppercase">
            <span aria-hidden className="h-px w-6 bg-white/15" />
            What you get
          </span>
          <h2 className="text-balance text-[34px] font-medium leading-[1.06] tracking-[-0.02em] text-white md:text-[46px]">
            The trenches are evolving.
          </h2>
          <p className="max-w-[560px] text-balance text-[15px] leading-[1.6] text-white/55 md:text-[17px]">
            You&rsquo;re competing with automation. TrenchersAI gives you the
            terminal, agents, wallets, and speed to play the game differently.
          </p>
        </motion.header>

        <motion.div
          className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/6 bg-white/4 sm:grid-cols-2 md:mt-20 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
        >
          {FEATURES.map((item) => (
            <div
              key={item.title}
              className="site-canvas-bg flex w-full min-w-0 flex-col gap-3 px-6 py-8 md:px-7 md:py-10"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/3">
                {item.icon}
              </div>
              <h3 className="text-[17px] font-medium leading-tight text-white md:text-[18px]">
                {item.title}
              </h3>
              <p className="text-[14px] leading-[1.55] text-white/55 md:text-[15px]">
                {item.description}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
