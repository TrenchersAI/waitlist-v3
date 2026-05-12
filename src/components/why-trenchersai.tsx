"use client";

import { motion } from "motion/react";
import { BorderBeam } from "border-beam";

const reveal = {
  initial: { opacity: 0, y: 24 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  /** Lower threshold + bottom margin = cards start fading in before they're
     fully in view, so scroll reveals less "wait then pop" between sections. */
  viewport: {
    once: true,
    amount: 0.12,
    margin: "0px 0px 18% 0px",
  } as const,
  transition: { duration: 0.45, ease: "easeOut" as const },
};

const CHALLENGES = [
  {
    lead: "The trenches are already automated.",
    rest: "You're not racing humans—you're racing infra, speed, and wallets that move before CT blinks.",
  },
  {
    lead: "Top traders have private infra and custom bots.",
    rest: "You get browser tabs and hope.",
  },
  {
    lead: "Advanced trading is still too hard to use.",
    rest: "Winners run bots and private pipes. Everyone else duct-tapes tools together.",
  },
  {
    lead: "Most trenches are still a patchwork of tools.",
    rest: "Popups, TG, dashboards—same grind, new week.",
  },
  {
    lead: "The edge is there.",
    rest: "Most tools still feel like homework.",
  },
];

const SOLUTIONS = [
  {
    lead: "One terminal for everything.",
    rest: "Discover, snipe, copy, track—one surface, zero tab circus.",
  },
  {
    lead: "Spawnable AI agents. Full control.",
    rest: "Agents live inside the terminal—not a folder of half-working scripts.",
  },
  {
    lead: "Spawn AI agents that run while you sleep.",
    rest: "Each agent, its own wallet—you only risk what you fund.",
  },
  {
    lead: "Say it → fund it → let it trade.",
    rest: "No script surgery—keeps running while you're AFK.",
  },
];

export function WhyTrenchersAICards() {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-none flex-col gap-5 rounded-xl text-left sm:max-w-96 md:max-w-104 md:gap-6">
      <Card title="Challenges" items={CHALLENGES} delay={0} />
      <Card
        title="What changes with TrenchersAI"
        items={SOLUTIONS}
        delay={0.02}
      />
    </div>
  );
}

type CardProps = {
  title: string;
  items: ReadonlyArray<{ lead: string; rest: string }>;
  delay: number;
};

function Card({ title, items, delay }: CardProps) {
  return (
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
        className="relative flex flex-col gap-3 rounded-xl bg-[#121212] px-4 pt-4 pb-6 md:gap-4 md:pb-7"
        {...reveal}
        transition={{ ...reveal.transition, delay }}
      >
        <h2 className="text-[14px] font-semibold text-white md:text-[15px]">
          {title}
        </h2>
        <ul className="flex flex-col gap-2.5 md:gap-3">
          {items.map((item) => (
            <li key={item.lead} className="text-[12px] md:text-[13px]">
              <div className="font-medium leading-tight text-white">
                {item.lead}
              </div>
              <div className="-mt-1 leading-snug text-neutral-400">
                {item.rest}
              </div>
            </li>
          ))}
        </ul>
      </motion.section>
    </BorderBeam>
  );
}
