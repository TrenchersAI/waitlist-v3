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
    rest: "You're racing infra and wallets, not just people in chat.",
  },
  {
    lead: "Pros run private stacks. You run tabs.",
    rest: "Bots and pipes move before you finish a tab switch.",
  },
  {
    lead: "Trading is still a patchwork.",
    rest: "TG, dashboards, alerts, same grind. Most tools still feel like homework.",
  },
];

const SOLUTIONS = [
  {
    lead: "One terminal.",
    rest: "Discover, snipe, copy, and track without the tab circus.",
  },
  {
    lead: "Spawnable AI agents.",
    rest: "Each with its own wallet. Risk only what you fund.",
  },
  {
    lead: "Say it, fund it, walk away.",
    rest: "No script surgery. Agents keep running while you're AFK.",
  },
];

type WhyTrenchersAICardsProps = {
  className?: string;
};

export function WhyTrenchersAICards({ className }: WhyTrenchersAICardsProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full min-w-0 max-w-none flex-col gap-5 rounded-xl text-left sm:max-w-96 md:max-w-104 md:gap-6",
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
        className="relative flex flex-col gap-4 rounded-xl bg-[#121212] px-5 pt-4 pb-5 md:gap-4 md:px-5 md:pt-5 md:pb-6"
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
              className="flex flex-col gap-1 border-t border-white/6 py-3 first:border-t-0 first:pt-0 md:gap-1.5 md:py-3.5"
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
