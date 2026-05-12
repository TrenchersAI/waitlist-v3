"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import { BorderBeam } from "border-beam";

const reveal = {
  initial: { opacity: 0, y: 24, filter: "blur(10px)" } as const,
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" } as const,
  viewport: { once: true, amount: 0.35 } as const,
  transition: { duration: 0.65, ease: "easeOut" as const },
};

type CardsProps = {
  embedded?: boolean;
};

/** BorderBeam + copy blocks only — use inside Hero or full-page section */
export function WhyTrenchersAICards({ embedded = false }: CardsProps) {
  return (
    <div
      className={clsx(
        "mx-auto flex w-full flex-col rounded-xl text-left",
        embedded
          ? "min-w-0 w-full max-w-none gap-5 sm:max-w-96 md:max-w-104 md:gap-6"
          : "w-full max-w-[600px] gap-16 px-4 py-20 md:gap-20 md:px-6 md:py-8 lg:px-6",
      )}
    >
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
          className={clsx(
            "relative flex flex-col rounded-xl bg-[#121212]",
            embedded
              ? "gap-3 px-4 pt-4 pb-12 md:gap-4 md:pb-14"
              : "gap-4 px-6 pt-6 pb-16 md:gap-5",
          )}
          {...reveal}
        >
          <h2
            className={clsx(
              "font-semibold text-white",
              embedded ? "text-[14px] md:text-[15px]" : "text-[16px] md:text-xl",
            )}
          >
            Challenges
          </h2>
          <p
            className={clsx(
              "font-normal text-neutral-400",
              embedded
                ? "text-[12px] leading-6 md:text-[13px] md:leading-7"
                : "text-[14px] leading-7 md:text-[16px]",
            )}
          >
            The trenches are already automated. You are not just competing with
            other traders anymore. You are competing with infra, faster
            execution, and wallets that react before CT even notices. Advanced
            trading is still too hard to use. The best traders have automation,
            fast execution, private infra, and bots. Most trenches have tabs,
            wallet popups, telegram commands, confusing dashboards, and a brutal
            learning curve. The edge is there. The onboarding is broken.
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
          className={clsx(
            "relative flex flex-col rounded-xl bg-[#121212]",
            embedded
              ? "gap-3 px-4 pt-4 pb-12 md:gap-4 md:pb-10"
              : "gap-4 px-6 pt-6 pb-16 md:gap-5 md:pb-12",
          )}
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.06 }}
        >
          <h2
            className={clsx(
              "font-semibold text-white",
              embedded ? "text-[14px] md:text-[15px]" : "text-[16px] md:text-xl",
            )}
          >
            What changes with TrenchersAI
          </h2>
          <p
            className={clsx(
              "font-normal text-neutral-400",
              embedded
                ? "text-[12px] leading-6 md:text-[13px] md:leading-7"
                : "text-[14px] leading-7 md:text-[16px]",
            )}
          >
            One terminal. Spawnable AI agents. Full control. TrenchersAI gives
            traders one place to discover, snipe, copy, track, and manage
            positions with AI agents built directly into the terminal. Describe
            what you want {">"} Fund the bot {">"} Let it run while you are
            asleep.
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-22 bg-linear-to-t from-black to-transparent" />
        </motion.section>
      </BorderBeam>
    </div>
  );
}

type WhyTrenchersAIProps = {
  embedded?: boolean;
};

/** Full-viewport section (e.g. dedicated route) */
export default function WhyTrenchersAI({ embedded = false }: WhyTrenchersAIProps) {
  return (
    <section
      className={clsx(
        "relative w-full",
        embedded
          ? "min-h-0 py-0"
          : "flex h-screen items-center justify-center bg-[#0a0a0a] bg-[linear-gradient(rgb(0_0_0/var(--site-noise-overlay-opacity)),rgb(0_0_0/var(--site-noise-overlay-opacity))),url('/bg.svg')] bg-cover bg-center bg-no-repeat",
      )}
    >
      <WhyTrenchersAICards embedded={embedded} />
    </section>
  );
}
