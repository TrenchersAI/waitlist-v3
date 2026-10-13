"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
} from "motion/react";

import { BotUnitCard, type BotUnit } from "./bot-unit-card";
import { BOT_UNIT_CARD_CAROUSEL_HEIGHT_CLASS } from "./bot-unit-card-styles";
import { BOT_UNIT_TOUR_FLEET } from "./bot-unit-demo-data";
import AiAgentTourBuyExecutedIcon from "./icons/ai-agent-tour-buy-executed-icon";
import AiAgentTourLaunchDetectedIcon from "./icons/ai-agent-tour-launch-detected-icon";
import AiAgentTourLiquidityCheckedIcon from "./icons/ai-agent-tour-liquidity-checked-icon";
import AiAgentTourSnipeCompleteIcon from "./icons/ai-agent-tour-snipe-complete-icon";

/* ----------------------------------------------------------------------- */
/* Activity timeline: trenchers_fe `AiAgentTourWelcomeIllustration`          */
/* ----------------------------------------------------------------------- */

const SUBSTEP_STAGGER_MS = 380;
const SUBSTEP_INITIAL_DELAY_MS = 320;

const ACTIVITY_PILL_STYLE: CSSProperties = {
  display: "flex",
  width: 208,
  padding: 8,
  alignItems: "center",
  gap: 6,
  borderRadius: 10,
  background:
    "linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(0deg, #333 0%, #333 100%), rgba(101, 103, 101, 0.80)",
  boxShadow:
    "0 1px 0 0 rgba(255, 255, 255, 0.15) inset, 0 0 0 1px rgba(255, 255, 255, 0.05) inset, 0 1px 1px -0.5px rgba(0, 0, 0, 0.18), 0 2px 2px -1px rgba(0, 0, 0, 0.04), 0 4px 4px -2px rgba(0, 0, 0, 0.02), 0 8px 4px -3px rgba(0, 0, 0, 0.01)",
};

const ACTIVITY_PILL_CHILD_STYLE: CSSProperties = {
  ...ACTIVITY_PILL_STYLE,
  width: 170,
};

const SUBTASK_STEPS = [
  {
    label: "Launch detected",
    icon: <AiAgentTourLaunchDetectedIcon className="size-3 shrink-0" />,
  },
  {
    label: "Liquidity checked",
    icon: <AiAgentTourLiquidityCheckedIcon className="size-3 shrink-0" />,
  },
  {
    label: "Buy executed",
    icon: <AiAgentTourBuyExecutedIcon className="size-4 shrink-0" />,
  },
] as const;

function ActivityPill({
  style,
  label,
  icon,
  className,
}: {
  style: CSSProperties;
  label: string;
  icon: ReactNode;
  className?: string;
}) {
  return (
    <div style={style} className={className}>
      {icon}
      <span className="text-xs leading-none text-white">{label}</span>
    </div>
  );
}

function ActivityTimeline() {
  return (
    <div className="relative mx-auto w-fit max-w-full">
      <ActivityPill
        style={ACTIVITY_PILL_STYLE}
        label="Snipe Complete"
        className="ai-agent-tour-snipe-enter"
        icon={
          <span
            className="ai-agent-tour-substep-icon inline-flex"
            style={{ animationDelay: "80ms" }}
          >
            <AiAgentTourSnipeCompleteIcon className="size-[15px] shrink-0" />
          </span>
        }
      />

      <div className="relative mt-2.5 pl-[2.375rem]">
        <div
          className="ai-agent-tour-connector-v pointer-events-none absolute top-0 bottom-4 left-[0.95rem] w-px border-l border-dashed border-white/15"
          style={{ animationDelay: `${SUBSTEP_INITIAL_DELAY_MS}ms` }}
        />
        <div className="relative flex flex-col gap-3 pt-1">
          {SUBTASK_STEPS.map((step, index) => {
            const stepDelay = SUBSTEP_INITIAL_DELAY_MS + index * SUBSTEP_STAGGER_MS;
            return (
              <div key={step.label} className="relative">
                <div
                  className="ai-agent-tour-substep-branch pointer-events-none absolute left-[-1.4rem] top-1/2 h-[18px] w-[21px] -translate-y-1/2 rounded-bl-full border-b border-l border-dashed border-white/15"
                  style={{ animationDelay: `${stepDelay}ms` }}
                />
                <ActivityPill
                  style={{ ...ACTIVITY_PILL_CHILD_STYLE, animationDelay: `${stepDelay}ms` }}
                  label={step.label}
                  className="ai-agent-tour-substep-enter"
                  icon={
                    <span
                      className="ai-agent-tour-substep-icon inline-flex"
                      style={{ animationDelay: `${stepDelay + 80}ms` }}
                    >
                      {step.icon}
                    </span>
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Fleet marquee: trenchers_fe `AiAgentTourMemoryGrid`                       */
/* ----------------------------------------------------------------------- */

const MARQUEE_PX_PER_MS = 0.038;
const BOT_CARD_SOURCE_WIDTH_PX = 280;
const BOT_CARD_SOURCE_HEIGHT_PX = 168;
const MARQUEE_CARD_SCALE = 0.84;
const MARQUEE_CELL_WIDTH_PX = Math.round(BOT_CARD_SOURCE_WIDTH_PX * MARQUEE_CARD_SCALE);
const MARQUEE_CELL_HEIGHT_PX = Math.round(BOT_CARD_SOURCE_HEIGHT_PX * MARQUEE_CARD_SCALE);

function rowBots(offset: number, count = 5): BotUnit[] {
  return Array.from(
    { length: count },
    (_, i) => BOT_UNIT_TOUR_FLEET[(offset + i) % BOT_UNIT_TOUR_FLEET.length],
  );
}

const FLEET_ROWS = [
  { bots: rowBots(0), direction: "left" },
  { bots: rowBots(3), direction: "right" },
  { bots: rowBots(6), direction: "left" },
] as const;

function BotUnitCardCell({ bot }: { bot: BotUnit }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg"
      style={{ width: MARQUEE_CELL_WIDTH_PX, height: MARQUEE_CELL_HEIGHT_PX }}
    >
      <div
        className="pointer-events-none absolute top-0 left-0 origin-top-left"
        style={{
          width: BOT_CARD_SOURCE_WIDTH_PX,
          transform: `scale(${MARQUEE_CARD_SCALE})`,
        }}
      >
        <BotUnitCard bot={bot} className={BOT_UNIT_CARD_CAROUSEL_HEIGHT_CLASS} hideFooterAction />
      </div>
    </div>
  );
}

function BotUnitMarqueeRow({
  bots,
  direction,
  running,
}: {
  bots: readonly BotUnit[];
  direction: "left" | "right";
  running: boolean;
}) {
  const track = [...bots, ...bots];
  const trackRef = useRef<HTMLDivElement>(null);
  const f = useMotionValue(direction === "right" ? 1 : 0);
  const x = useMotionValue(0);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const syncX = () => {
      const seg = el.scrollWidth / 2;
      if (seg > 0) x.set(-f.get() * seg);
    };
    syncX();
    const ro = new ResizeObserver(syncX);
    ro.observe(el);
    return () => ro.disconnect();
  }, [f, x]);

  useAnimationFrame((_, delta) => {
    if (!running) return;
    const el = trackRef.current;
    if (!el) return;
    const seg = el.scrollWidth / 2;
    if (seg <= 0) return;
    const df = (MARQUEE_PX_PER_MS * delta) / seg;
    const t = f.get();
    const next =
      direction === "left" ? (((t + df) % 1) + 1) % 1 : (((t - df) % 1) + 1) % 1;
    f.set(next);
    x.set(-next * seg);
  });

  return (
    <div className="flex w-full min-w-0 justify-start overflow-hidden">
      <motion.div ref={trackRef} className="flex w-max max-w-none shrink-0 gap-4" style={{ x }}>
        {track.map((bot, i) => (
          <BotUnitCardCell key={`${bot.id}-${i}`} bot={bot} />
        ))}
      </motion.div>
    </div>
  );
}

const FLEET_FADE_MASK =
  "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)";

/** Agents trading on their own: the activity feed beside the running fleet. */
export function RunPreview({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduceMotion = useReducedMotion();
  const [timelineKey, setTimelineKey] = useState(0);
  const [wasInView, setWasInView] = useState(inView);
  if (inView !== wasInView) {
    setWasInView(inView);
    if (inView) setTimelineKey((k) => k + 1);
  }

  return (
    <div
      ref={ref}
      aria-hidden
      className={clsx(
        "flex w-full select-none flex-col items-center gap-8 lg:flex-row lg:gap-10",
        className,
      )}
    >
      <div className="flex shrink-0 justify-center lg:w-[260px]">
        <ActivityTimeline key={timelineKey} />
      </div>
      <div
        className="relative flex w-full min-w-0 flex-1 flex-col gap-2"
        style={{
          maskImage: FLEET_FADE_MASK,
          WebkitMaskImage: FLEET_FADE_MASK,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      >
        {FLEET_ROWS.map((row, i) => (
          <BotUnitMarqueeRow
            key={i}
            bots={row.bots}
            direction={row.direction}
            running={inView && !reduceMotion}
          />
        ))}
      </div>
    </div>
  );
}
