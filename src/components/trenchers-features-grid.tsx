"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

type Feature = {
  title: string;
  description: string;
  icon: ReactNode;
};

const ICON_CLASS = "size-5 shrink-0 stroke-[1.35] text-amber-200/85";

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
      "No coding. No messy setup. Just describe the strategy and confirm.",
    icon: <IconChat />,
  },
  {
    title: "Sub-ms signing infrastructure",
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
      "Competitors charge around 0.9–1% per swap. TrenchersAI is built to charge less.",
    icon: <IconPercent />,
  },
  {
    title: "Trader rewards",
    description:
      "Active traders get more back instead of just paying fees forever.",
    icon: <IconGift />,
  },
];

export default function TrenchersFeaturesGrid() {
  return (
    <section className="relative w-full border-t border-neutral-900/80 bg-black py-20 md:py-28">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 md:px-6 lg:px-8">
        <motion.header
          className="mx-auto flex w-full min-w-0 max-w-2xl flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="w-full min-w-0 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            The Trenches Are Evolving.
          </h2>
          <p className="w-full min-w-0 max-w-xl text-[15px] leading-7 text-neutral-400 md:text-base md:leading-7">
            You are competing with automatio. TrenchersAI gives you the
            terminal, agents, wallets, and speed to play the game differently.
          </p>
        </motion.header>

        <motion.div
          className="mt-6 grid w-full min-w-0 grid-cols-1 gap-px bg-neutral-800 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.65, ease: "easeOut", delay: 0.05 }}
        >
          {FEATURES.map((item) => (
            <div
              key={item.title}
              className="flex w-full min-w-0 flex-col items-start gap-3 bg-black px-4 py-8 sm:py-10 md:px-6 lg:px-6"
            >
              {item.icon}
              <h3 className="text-base font-semibold leading-snug text-white md:text-[17px]">
                {item.title}
              </h3>
              <p className="text-left text-sm leading-relaxed text-neutral-400 md:text-[15px] md:leading-7">
                {item.description}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
