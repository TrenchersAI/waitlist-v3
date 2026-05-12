"use client";

import { motion } from "motion/react";
import { BorderBeam } from "border-beam";
import { cn } from "@/src/lib/utils";

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
    rest: "You aren't racing humans, you're racing infra, speed, and wallets that move before CT blinks.",
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
    rest: "Popups, TG, dashboards, same grind every week.",
  },
  {
    lead: "The edge is there.",
    rest: "Most tools still feel like homework.",
  },
];

const SOLUTIONS = [
  {
    lead: "One terminal for everything.",
    rest: "Discover, snipe, copy, and track from one surface, fewer tabs.",
  },
  {
    lead: "Spawnable AI agents. Full control.",
    rest: "Agents stay in the terminal, not in a folder of half-done scripts.",
  },
  {
    lead: "Spawn AI agents that run while you sleep.",
    rest: "Each agent has its own wallet, so you only risk what you fund.",
  },
  {
    lead: "Say it → fund it → let it trade.",
    rest: "No script surgery, it keeps running while you're AFK.",
  },
];

type WhyTrenchersAICardsProps = {
  className?: string;
};

export function WhyTrenchersAICards({ className }: WhyTrenchersAICardsProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full min-w-0 max-w-none flex-col gap-6 rounded-xl text-left sm:max-w-96 md:max-w-104 md:gap-8",
        className,
      )}
    >
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
        className="relative flex flex-col gap-5 rounded-xl bg-[#121212] px-5 pt-5 pb-7 md:gap-6 md:px-6 md:pt-6 md:pb-8"
        {...reveal}
        transition={{ ...reveal.transition, delay }}
      >
        <h2 className="text-[15px] font-semibold leading-snug tracking-tight text-white md:text-base">
          {title}
        </h2>
        <ul className="flex flex-col gap-0">
          {items.map((item) => (
            <li
              key={item.lead}
              className="flex flex-col gap-1.5 border-t border-white/6 py-4 first:border-t-0 first:pt-0 md:gap-2 md:py-5"
            >
              <div className="text-[13px] font-medium leading-snug text-white md:text-[14px]">
                {item.lead}
              </div>
              <div className="text-[12px] leading-relaxed text-neutral-400 md:text-[13px] md:leading-relaxed">
                {item.rest}
              </div>
            </li>
          ))}
        </ul>
      </motion.section>
    </BorderBeam>
  );
}
