"use client";

import React from "react";
import useMeasure from "react-use-measure";
import { AnimatePresence, useInView } from "motion/react";
import { motion, useMotionValue, useTransform } from "motion/react";

import { BOT_UNIT_CARD_ENTRANCE_STAGGER_MS } from "@/src/components/bot-unit-card-styles";

import { BotUnitCard } from "./agent-unit-card";
import InputFeint, { AGENT_CREATION_PLACEHOLDER } from "./input-feint";

export function mergeRefs<T = unknown>(
  refs: Array<
    React.MutableRefObject<T> | React.LegacyRef<T> | undefined | null
  >,
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

const modules = [
  "Watching new token launches…            ",
  "Tracking whales & smart wallets…            ",
  "Deploying AI bot templates…            ",
  "Agent ready",
];

const ICON_SEQUENCE = [MicIcon, VoiceLineIcon, PatternIcon, TickIcon];

export function useLoop(): [
  string,
  number,
  React.RefObject<HTMLDivElement | null>,
] {
  const [active, setActive] = React.useState(modules[0]);
  const [progress, setProgress] = React.useState(1);

  const ref = React.useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref);

  React.useEffect(() => {
    if (!isInView) return;

    const interval = setInterval(() => {
      setActive((current) => {
        const index = modules.indexOf(current);
        const nextIndex = (index + 1) % modules.length;
        return modules[nextIndex];
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isInView]);

  React.useEffect(() => {
    if (!isInView) return;

    let frameId: number;
    let start = performance.now();
    const DURATION = 6000;

    const tick = (now: number) => {
      const elapsed = (now - start) % DURATION;
      const t = elapsed / DURATION;

      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const value = Math.max(1, Math.round(eased * 100));
      setProgress(value);

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isInView]);

  return [active, progress, ref];
}

const DEMO_AGENT_UNITS = [
  {
    id: "unit-1",
    name: "Sniper bot",
    pid: "7xh…9kp",
    balance: "$2.40k",
    delta: "+12.4%",
    trend: "#2FE0A4",
    dateLabel: "Today",
    trades: "0",
  },
  {
    id: "unit-2",
    name: "Copy-trade bot",
    pid: "4Fq…m22",
    balance: "$890",
    delta: "+4.1%",
    trend: "#2FE0A4",
    dateLabel: "Today",
    trades: "0",
  },
  {
    id: "unit-3",
    name: "Momentum bot",
    pid: "9Aa…3nz",
    balance: "$14.2k",
    delta: "+21%",
    trend: "#2FE0A4",
    dateLabel: "Today",
    trades: "0",
  },
] as const;

const CARDS_VISIBLE_MS = 5500;
/** How long the input + shimmer intro runs before morphing. */
const INTRO_DURATION_MS = 2800;

type DemoPhase = "intro" | "morph" | "cards";

/** Delay between each agent card entrance (after morph completes). */
const CARD_ENTRANCE_STAGGER_S = BOT_UNIT_CARD_ENTRANCE_STAGGER_MS / 1000;
/** Same stagger for dismiss order (top → bottom). */
const CARD_EXIT_STAGGER_MS = CARD_ENTRANCE_STAGGER_S * 1000;
/** Exit animation length per card (must match {@link agentCardVariants}.exit). */
const CARD_EXIT_DURATION_S = 0.38;
/** Initial backdrop blur on card entrance (animates to sharp). */
const CARD_ENTRANCE_BLUR_PX = 10;

const agentCardVariants = {
  initial: {
    opacity: 0,
    y: 16,
    filter: `blur(${CARD_ENTRANCE_BLUR_PX}px)`,
  },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring" as const,
      stiffness: 420,
      damping: 32,
      delay: i * CARD_ENTRANCE_STAGGER_S,
    },
  }),
  exit: {
    opacity: 0,
    y: -14,
    filter: `blur(${CARD_ENTRANCE_BLUR_PX}px)`,
    transition: {
      duration: CARD_EXIT_DURATION_S,
      ease: "easeInOut" as const,
    },
  },
};

function MorphingSequence({ onComplete }: { onComplete: () => void }) {
  const completeFired = React.useRef(false);
  const [ref, bounds] = useMeasure();
  const [active, progress, ref2] = useLoop();
  const progressValue = useMotionValue(progress);

  const scale = useTransform(progressValue, [1, 100], [0.96, 1]);

  const glow = useTransform(progressValue, [70, 100], ["0px", "6px"]);

  const color = useTransform(
    progressValue,
    [1, 40, 100],
    ["#6B7280", "#A3A3A3", "#FFFFFF"],
  );

  const textShadow = useTransform(glow, (g) => {
    return `0 0 ${g} rgba(255,255,255,0.35)`;
  });

  const secondaryLabelColor = useTransform(
    progressValue,
    [1, 100],
    ["#737373", "#D4D4D4"],
  );

  React.useEffect(() => {
    progressValue.set(progress);
  }, [progress]);

  React.useEffect(() => {
    if (completeFired.current) return;
    if (progress === 100) {
      completeFired.current = true;
      onComplete();
    }
  }, [progress, onComplete]);

  const activeIndex = React.useMemo(() => modules.indexOf(active), [active]);

  const ActiveIcon = ICON_SEQUENCE[activeIndex];

  const TIME_REMAINING = [
    "Solana · sniping layer",
    "Copy rails · whale feeds",
    "Fees · rewards profile",
    "",
  ];

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <motion.div
        className="text-xs mb-5 w-full text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.span
          style={{
            color,
            scale,
            textShadow,
            originX: "left",
          }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 20,
          }}
        >
          {progress}%
        </motion.span>

        <motion.span
          className="ml-1"
          style={{
            color: secondaryLabelColor,
          }}
        >
          {progress >= 98 ? "live" : "· Provisioning"}
        </motion.span>
      </motion.div>

      <div className="flex w-fit flex-col items-center">
        <div className="py-5 px-5 border-[1.5px] border-black bg-[linear-gradient(0deg,#0F0F0F_-4.26%,#0B0B0B_100%)] shadow-[0_1.5px_0_0_#2A2A2A] relative w-fit shadow-menu rounded-full flex items-center justify-center select-none overflow-hidden whitespace-nowrap ">
          <motion.div
            animate={{ width: bounds.width > 0 ? bounds.width : "auto" }}
            transition={{
              type: "spring",
              bounce: 0.4,
            }}
          >
            <div
              ref={mergeRefs([ref, ref2])}
              className="flex items-center gap-2 w-fit [&>svg]:w-5 [&>svg]:h-5"
            >
              <div className="relative size-5 flex items-center justify-center">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.6, rotate: 10 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                    className="absolute"
                  >
                    <ActiveIcon />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="text-xs text-neutral-400">
                <AnimatePresence mode="popLayout" initial={false}>
                  {active?.split("").map((letter, index) => {
                    return (
                      <motion.div
                        initial={{ opacity: 0, filter: "blur(2px)" }}
                        animate={{
                          opacity: 1,
                          filter: "blur(0px)",
                          transition: {
                            type: "spring",
                            stiffness: 350,
                            damping: 55,
                            delay: index * 0.008,
                          },
                        }}
                        exit={{
                          opacity: 0,
                          filter: "blur(2px)",
                          transition: {
                            type: "spring",
                            stiffness: 500,
                            damping: 55,
                          },
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 55,
                        }}
                        key={index + letter + active}
                        className="inline-block"
                      >
                        {letter}
                        {letter === " " ? "\u00A0" : ""}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
          <div className="text-xs text-neutral-500 flex items-center gap-1 z-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-center gap-1"
              >
                <span>{TIME_REMAINING[activeIndex]}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Morphing() {
  const [phase, setPhase] = React.useState<DemoPhase>("intro");
  const [loopEpoch, setLoopEpoch] = React.useState(0);
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(
    DEMO_AGENT_UNITS[0].id,
  );
  const [visibleCardIds, setVisibleCardIds] = React.useState<string[]>(() =>
    DEMO_AGENT_UNITS.map((u) => u.id),
  );
  const dismissTimersRef = React.useRef<number[]>([]);

  const visibleBots = React.useMemo(() => {
    const keep = new Set(visibleCardIds);
    return DEMO_AGENT_UNITS.filter((u) => keep.has(u.id));
  }, [visibleCardIds]);

  const handleIntroComplete = React.useCallback(() => {
    setPhase("morph");
  }, []);

  const revealCards = React.useCallback(() => {
    setPhase("cards");
  }, []);

  React.useEffect(() => {
    if (phase === "cards") {
      setVisibleCardIds(DEMO_AGENT_UNITS.map((u) => u.id));
    }
  }, [phase, loopEpoch]);

  React.useEffect(() => {
    if (phase !== "cards") return;

    dismissTimersRef.current.forEach(clearTimeout);
    dismissTimersRef.current = [];

    const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      dismissTimersRef.current.push(id);
      return id;
    };

    const n = DEMO_AGENT_UNITS.length;
    const totalExitMs =
      (n - 1) * CARD_EXIT_STAGGER_MS + CARD_EXIT_DURATION_S * 1000;

    schedule(() => {
      DEMO_AGENT_UNITS.forEach((_, index) => {
        schedule(() => {
          setVisibleCardIds((prev) => prev.slice(1));
        }, index * CARD_EXIT_STAGGER_MS);
      });
      schedule(() => {
        setPhase("intro");
        setLoopEpoch((e) => e + 1);
      }, totalExitMs);
    }, CARDS_VISIBLE_MS);

    return () => {
      dismissTimersRef.current.forEach(clearTimeout);
      dismissTimersRef.current = [];
    };
  }, [phase, loopEpoch]);

  return (
    <div className="relative mx-auto flex w-full max-w-[420px] flex-col items-center gap-6">
      <AnimatePresence mode="wait">
        {phase === "intro" ? (
          <motion.div
            key={`intro-${loopEpoch}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex w-full flex-col items-center"
          >
            <InputFeint
              shimmerPrompt={AGENT_CREATION_PLACEHOLDER}
              introDurationMs={INTRO_DURATION_MS}
              onIntroComplete={handleIntroComplete}
              introReadOnly
            />
          </motion.div>
        ) : phase === "morph" ? (
          <motion.div
            key={`morph-${loopEpoch}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex w-full flex-col items-center"
          >
            <MorphingSequence onComplete={revealCards} />
          </motion.div>
        ) : (
          <motion.div
            key="agent-cards"
            className="flex w-full flex-col gap-3"
          >
            <AnimatePresence>
              {visibleBots.map((bot) => (
                <motion.div
                  key={bot.id}
                  custom={DEMO_AGENT_UNITS.findIndex((u) => u.id === bot.id)}
                  variants={agentCardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <BotUnitCard
                    bot={bot}
                    isSelected={selectedAgentId === bot.id}
                    onSelect={() => setSelectedAgentId(bot.id)}
                    sparklineEntranceIndex={Math.max(
                      0,
                      DEMO_AGENT_UNITS.findIndex((u) => u.id === bot.id),
                    )}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IconArrowSeparateVertical() {
  return (
    <svg
      width="16px"
      height="16px"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 6.5L8 3.5L11 6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 9.5L8 12.5L5 9.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ListeningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path
        d="M7 1.75C7.14288 1.75002 7.28078 1.80247 7.38755 1.89742C7.49432 1.99236 7.56253 2.12319 7.57925 2.26508L7.58333 2.33333V11.6667C7.58317 11.8153 7.52624 11.9584 7.42417 12.0665C7.32211 12.1746 7.18261 12.2396 7.03419 12.2483C6.88576 12.2571 6.73961 12.2088 6.6256 12.1133C6.51158 12.0179 6.43831 11.8826 6.42075 11.7349L6.41667 11.6667V2.33333C6.41667 2.17862 6.47812 2.03025 6.58752 1.92085C6.69692 1.81146 6.84529 1.75 7 1.75ZM4.66667 3.5C4.82138 3.5 4.96975 3.56146 5.07915 3.67085C5.18854 3.78025 5.25 3.92862 5.25 4.08333V9.91667C5.25 10.0714 5.18854 10.2197 5.07915 10.3291C4.96975 10.4385 4.82138 10.5 4.66667 10.5C4.51196 10.5 4.36358 10.4385 4.25419 10.3291C4.14479 10.2197 4.08333 10.0714 4.08333 9.91667V4.08333C4.08333 3.92862 4.14479 3.78025 4.25419 3.67085C4.36358 3.56146 4.51196 3.5 4.66667 3.5ZM9.33333 3.5C9.48804 3.5 9.63642 3.56146 9.74581 3.67085C9.85521 3.78025 9.91667 3.92862 9.91667 4.08333V9.91667C9.91667 10.0714 9.85521 10.2197 9.74581 10.3291C9.63642 10.4385 9.48804 10.5 9.33333 10.5C9.17862 10.5 9.03025 10.4385 8.92085 10.3291C8.81146 10.2197 8.75 10.0714 8.75 9.91667V4.08333C8.75 3.92862 8.81146 3.78025 8.92085 3.67085C9.03025 3.56146 9.17862 3.5 9.33333 3.5ZM2.33333 5.25C2.48804 5.25 2.63642 5.31146 2.74581 5.42085C2.85521 5.53025 2.91667 5.67862 2.91667 5.83333V8.16667C2.91667 8.32138 2.85521 8.46975 2.74581 8.57915C2.63642 8.68854 2.48804 8.75 2.33333 8.75C2.17862 8.75 2.03025 8.68854 1.92085 8.57915C1.81146 8.46975 1.75 8.32138 1.75 8.16667V5.83333C1.75 5.67862 1.81146 5.53025 1.92085 5.42085C2.03025 5.31146 2.17862 5.25 2.33333 5.25ZM11.6667 5.25C11.8095 5.25002 11.9474 5.30247 12.0542 5.39742C12.161 5.49236 12.2292 5.62319 12.2459 5.76508L12.25 5.83333V8.16667C12.2498 8.31535 12.1929 8.45835 12.0908 8.56646C11.9888 8.67458 11.8493 8.73964 11.7009 8.74835C11.5524 8.75706 11.4063 8.70877 11.2923 8.61335C11.1782 8.51792 11.105 8.38256 11.0874 8.23492L11.0833 8.16667V5.83333C11.0833 5.67862 11.1448 5.53025 11.2542 5.42085C11.3636 5.31146 11.512 5.25 11.6667 5.25Z"
        fill="#565656"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M9.99935 11.666C9.3049 11.666 8.71463 11.423 8.22851 10.9368C7.7424 10.4507 7.49935 9.86046 7.49935 9.16601V4.16601C7.49935 3.47157 7.7424 2.88129 8.22851 2.39518C8.71463 1.90907 9.3049 1.66602 9.99935 1.66602C10.6938 1.66602 11.2841 1.90907 11.7702 2.39518C12.2563 2.88129 12.4993 3.47157 12.4993 4.16601V9.16601C12.4993 9.86046 12.2563 10.4507 11.7702 10.9368C11.2841 11.423 10.6938 11.666 9.99935 11.666ZM9.16601 17.4993V14.9368C7.72157 14.7424 6.52713 14.0966 5.58268 12.9993C4.63824 11.9021 4.16602 10.6243 4.16602 9.16601H5.83268C5.83268 10.3188 6.23907 11.3016 7.05185 12.1143C7.86463 12.9271 8.84713 13.3332 9.99935 13.3327C11.1516 13.3321 12.1343 12.9257 12.9477 12.1135C13.761 11.3013 14.1671 10.3188 14.166 9.16601H15.8327C15.8327 10.6243 15.3605 11.9021 14.416 12.9993C13.4716 14.0966 12.2771 14.7424 10.8327 14.9368V17.4993H9.16601ZM9.99935 9.99934C10.2355 9.99934 10.4335 9.91934 10.5935 9.75934C10.7535 9.59934 10.8332 9.40157 10.8327 9.16601V4.16601C10.8327 3.9299 10.7527 3.73213 10.5927 3.57268C10.4327 3.41324 10.2349 3.33324 9.99935 3.33268C9.76379 3.33213 9.56601 3.41213 9.40601 3.57268C9.24601 3.73324 9.16601 3.93101 9.16601 4.16601V9.16601C9.16601 9.40212 9.24601 9.60018 9.40601 9.76018C9.56601 9.92018 9.76379 9.9999 9.99935 9.99934Z"
        fill="#565656"
      />
    </svg>
  );
}

function VoiceLineIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M10 2.5C10.2041 2.50003 10.4011 2.57496 10.5536 2.7106C10.7062 2.84623 10.8036 3.03312 10.8275 3.23583L10.8333 3.33333V16.6667C10.8331 16.8791 10.7518 17.0834 10.606 17.2378C10.4602 17.3923 10.2609 17.4852 10.0488 17.4976C9.8368 17.5101 9.62802 17.4411 9.46514 17.3048C9.30226 17.1685 9.19759 16.9751 9.1725 16.7642L9.16667 16.6667V3.33333C9.16667 3.11232 9.25446 2.90036 9.41074 2.74408C9.56702 2.5878 9.77899 2.5 10 2.5ZM6.66667 5C6.88768 5 7.09964 5.0878 7.25592 5.24408C7.4122 5.40036 7.5 5.61232 7.5 5.83333V14.1667C7.5 14.3877 7.4122 14.5996 7.25592 14.7559C7.09964 14.9122 6.88768 15 6.66667 15C6.44565 15 6.23369 14.9122 6.07741 14.7559C5.92113 14.5996 5.83333 14.3877 5.83333 14.1667V5.83333C5.83333 5.61232 5.92113 5.40036 6.07741 5.24408C6.23369 5.0878 6.44565 5 6.66667 5ZM13.3333 5C13.5543 5 13.7663 5.0878 13.9226 5.24408C14.0789 5.40036 14.1667 5.61232 14.1667 5.83333V14.1667C14.1667 14.3877 14.0789 14.5996 13.9226 14.7559C13.7663 14.9122 13.5543 15 13.3333 15C13.1123 15 12.9004 14.9122 12.7441 14.7559C12.5878 14.5996 12.5 14.3877 12.5 14.1667V5.83333C12.5 5.61232 12.5878 5.40036 12.7441 5.24408C12.9004 5.0878 13.1123 5 13.3333 5ZM3.33333 7.5C3.55435 7.5 3.76631 7.5878 3.92259 7.74408C4.07887 7.90036 4.16667 8.11232 4.16667 8.33333V11.6667C4.16667 11.8877 4.07887 12.0996 3.92259 12.2559C3.76631 12.4122 3.55435 12.5 3.33333 12.5C3.11232 12.5 2.90036 12.4122 2.74408 12.2559C2.5878 12.0996 2.5 11.8877 2.5 11.6667V8.33333C2.5 8.11232 2.5878 7.90036 2.74408 7.74408C2.90036 7.5878 3.11232 7.5 3.33333 7.5ZM16.6667 7.5C16.8708 7.50003 17.0678 7.57496 17.2203 7.7106C17.3728 7.84623 17.4703 8.03313 17.4942 8.23584L17.5 8.33333V11.6667C17.4998 11.8791 17.4184 12.0834 17.2726 12.2378C17.1268 12.3923 16.9275 12.4852 16.7155 12.4976C16.5035 12.5101 16.2947 12.4411 16.1318 12.3048C15.9689 12.1685 15.8643 11.9751 15.8392 11.7642L15.8333 11.6667V8.33333C15.8333 8.11232 15.9211 7.90036 16.0774 7.74408C16.2337 7.5878 16.4457 7.5 16.6667 7.5Z"
        fill="#565656"
      />
    </svg>
  );
}

function PatternIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M4.99962 16.0246C4.7174 16.0246 4.47573 15.9246 4.27462 15.7246C4.07351 15.5246 3.97351 15.283 3.97462 14.9996C3.97573 14.7163 4.07573 14.4746 4.27462 14.2746C4.47351 14.0746 4.71517 13.9746 4.99962 13.9746C5.06906 13.9746 5.13045 13.9796 5.18379 13.9896C5.23712 14.0007 5.29323 14.0202 5.35212 14.048L9.04795 10.3521C8.97851 10.1671 8.96323 9.97767 9.00212 9.78378C9.04101 9.5899 9.13268 9.42101 9.27712 9.27712C9.42156 9.13323 9.59045 9.04156 9.78379 9.00212C9.97823 8.96323 10.1677 8.97851 10.3521 9.04795L14.048 5.35212L13.998 5.18379C13.9818 5.13045 13.9738 5.06906 13.9738 4.99962C13.9738 4.7174 14.0743 4.47573 14.2755 4.27462C14.4766 4.07351 14.718 3.97351 14.9996 3.97462C15.2813 3.97573 15.523 4.07573 15.7246 4.27462C15.9263 4.47351 16.0263 4.71517 16.0246 4.99962C16.023 5.28406 15.923 5.52573 15.7246 5.72462C15.5263 5.92351 15.2846 6.02351 14.9996 6.02462C14.8285 6.02462 14.711 6.00017 14.6471 5.95129L10.9513 9.64295C11.0207 9.8274 11.036 10.0174 10.9971 10.213C10.9582 10.4085 10.8682 10.5768 10.7271 10.718C10.5766 10.868 10.4043 10.9627 10.2105 11.0021C10.016 11.041 9.82656 11.0243 9.64212 10.9521L6.03795 14.5513L6.07045 14.583H9.06379C9.15267 14.3974 9.27934 14.2493 9.44379 14.1388C9.60823 14.0288 9.79184 13.9738 9.99462 13.9738C10.2074 13.9738 10.3996 14.0282 10.5713 14.1371C10.7424 14.2455 10.8671 14.3941 10.9455 14.583H14.0538C14.1427 14.3941 14.2702 14.2452 14.4363 14.1363C14.6024 14.028 14.7902 13.9738 14.9996 13.9738C15.2818 13.9738 15.5235 14.0743 15.7246 14.2755C15.9257 14.4766 16.0257 14.718 16.0246 14.9996C16.0235 15.2813 15.9235 15.523 15.7246 15.7246C15.5257 15.9263 15.2841 16.0263 14.9996 16.0246C14.7902 16.0246 14.6024 15.9699 14.4363 15.8605C14.2702 15.7505 14.1427 15.6024 14.0538 15.4163H10.9455C10.8677 15.6052 10.7421 15.7541 10.5688 15.863C10.3955 15.9713 10.2057 16.0255 9.99962 16.0255C9.79351 16.0255 9.60823 15.9705 9.44379 15.8605C9.27934 15.7505 9.15267 15.6024 9.06379 15.4163H5.93545C5.85767 15.6024 5.73267 15.7505 5.56045 15.8605C5.38767 15.9705 5.20073 16.0255 4.99962 16.0255M4.99962 11.0255C4.7174 11.0255 4.47573 10.9249 4.27462 10.7238C4.07351 10.5227 3.97351 10.2813 3.97462 9.99962C3.97573 9.71795 4.07573 9.47628 4.27462 9.27462C4.47351 9.07295 4.71517 8.97295 4.99962 8.97462C5.28406 8.97629 5.52573 9.07628 5.72462 9.27462C5.92351 9.47295 6.02351 9.71462 6.02462 9.99962C6.02573 10.2846 5.92573 10.5263 5.72462 10.7246C5.52351 10.923 5.28184 11.023 4.99962 11.0246M4.99962 6.02462C4.7174 6.02462 4.47573 5.92462 4.27462 5.72462C4.07351 5.52462 3.97351 5.28295 3.97462 4.99962C3.97573 4.71629 4.07573 4.47462 4.27462 4.27462C4.47351 4.07462 4.71517 3.97462 4.99962 3.97462C5.28406 3.97462 5.52573 4.07462 5.72462 4.27462C5.92351 4.47462 6.02351 4.71629 6.02462 4.99962C6.02573 5.28295 5.92573 5.52462 5.72462 5.72462C5.52351 5.92462 5.28184 6.02462 4.99962 6.02462ZM9.99962 6.02462C9.7174 6.02462 9.47573 5.92462 9.27462 5.72462C9.07351 5.52462 8.97351 5.28295 8.97462 4.99962C8.97573 4.71629 9.07573 4.47462 9.27462 4.27462C9.47351 4.07462 9.71518 3.97462 9.99962 3.97462C10.2841 3.97462 10.5257 4.07462 10.7246 4.27462C10.9235 4.47462 11.0235 4.71629 11.0246 4.99962C11.0257 5.28295 10.9257 5.52462 10.7246 5.72462C10.5235 5.92462 10.2818 6.02462 9.99962 6.02462ZM14.9996 11.0246C14.7174 11.0246 14.4757 10.9246 14.2746 10.7246C14.0735 10.5246 13.9735 10.283 13.9746 9.99962C13.9757 9.71628 14.0757 9.47462 14.2746 9.27462C14.4735 9.07462 14.7152 8.97462 14.9996 8.97462C15.2841 8.97462 15.5257 9.07462 15.7246 9.27462C15.9235 9.47462 16.0235 9.71628 16.0246 9.99962C16.0257 10.283 15.9257 10.5246 15.7246 10.7246C15.5235 10.9246 15.2818 11.0246 14.9996 11.0246Z"
        fill="#565656"
      />
    </svg>
  );
}

function TickIcon() {
  return (
    <div className="size-5 flex justify-center items-center rounded-full bg-[#455EFF]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="7"
        height="5"
        viewBox="0 0 7 5"
        fill="none"
      >
        <path
          d="M0.5 3.22727L2 4.5L6.5 0.5"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
