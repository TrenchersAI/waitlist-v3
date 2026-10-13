"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";

import { BotUnitCard, type BotUnit } from "./bot-unit-card";
import { BotUnitLiveBadge, BotUnitPaperBadge } from "./bot-unit-env-badge";
import AiChatCheckIcon from "./icons/ai-chat-check-icon";
import DepositIcon from "./icons/deposit-icon";
import SpawnGlassCubeIcon from "./icons/spawn-glass-cube-icon";

/**
 * Display-only walk through trenchers_fe's Paper → Live promotion: the paper
 * agent on the Paper lens, the `ConfirmLiveBot` dialog
 * (`src/components/ai-agent/confirm-live-bot.tsx`, per-bot wallet flow), and
 * the new, empty live agent it hands off to. Copy, classes and states are the
 * app's; nothing is wired.
 */

/** trenchers_fe `ui/button.tsx` `BUTTON_PRIMARY_GRADIENT_CLASS`. */
const BUTTON_PRIMARY_GRADIENT_CLASS =
  "border-none bg-linear-to-b from-[#07F] to-[#003FAF] text-white [text-shadow:var(--text-shadow-button-label)]";

/** `PAGE_TOUR_CARD_SHELL_CLASS`. */
const PAGE_TOUR_CARD_SHELL_CLASS =
  "ui-surface-tour-card shadow-[0_20px_50px_rgba(0,0,0,0.55)]";

const GO_LIVE_BULLETS_WALLET = [
  "This agent gets its own wallet when you start — fund it on the agent after",
  "Your paper strategy is cloned into a new live agent",
] as const;

const BOT_NAME = "V-01_SNIPER";
const SPARKLINE = [2, 2.4, 2.1, 2.9, 3.3, 3.1, 3.8, 4.4, 4.2, 5.1, 5.6];

const PAPER_BOT: BotUnit = {
  id: "go-live-paper",
  name: BOT_NAME,
  pid: "paper",
  balance: "5.00 SOL",
  delta: "+18.4%",
  trend: "#2FE0A4",
  dateLabel: "Mar 2",
  trades: "30 trades",
  sparkline: SPARKLINE,
};

const LIVE_BOT: BotUnit = {
  id: "go-live-live",
  name: BOT_NAME,
  pid: "live",
  balance: "0 SOL",
  delta: "0.0%",
  trend: "#F2B34F",
  dateLabel: "Today",
  trades: "0 trades",
  sparkline: [1, 1, 1, 1, 1, 1],
};

type Phase = "paper" | "confirm" | "starting" | "approve" | "live";

const PHASES: { phase: Phase; ms: number }[] = [
  { phase: "paper", ms: 2600 },
  { phase: "confirm", ms: 2200 },
  { phase: "starting", ms: 1100 },
  { phase: "approve", ms: 1500 },
  { phase: "live", ms: 3600 },
];

function EnvironmentToggle({ env }: { env: "paper" | "live" }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5">
      {(["paper", "live"] as const).map((value) => (
        <span
          key={value}
          className={clsx(
            "inline-flex h-[30px] items-center justify-center rounded-[8px] px-4 py-1.5 text-sm font-normal tracking-normal transition-colors duration-300",
            env === value
              ? "environment-toggle-segment--active"
              : "text-white/45",
          )}
        >
          {value === "paper" ? "Paper" : "Live"}
        </span>
      ))}
    </div>
  );
}

function GoLiveWalletRow({ phase }: { phase: Phase }) {
  const inFlight = phase === "starting" || phase === "approve";
  return (
    <div className="mt-4 rounded-xl bg-white/2 p-3">
      <div className="flex items-center gap-1.5">
        <DepositIcon
          className={clsx(
            "size-4 shrink-0",
            inFlight ? "opacity-80" : "opacity-50",
          )}
        />
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-[13px] font-medium leading-none text-white">
            Agent wallet
          </span>
          {inFlight ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-white/55">
              <span className="size-3 animate-spin rounded-full border border-white/20 border-t-white/70" />
              {phase === "starting" ? "Setting up…" : "Approve in your wallet…"}
            </span>
          ) : (
            <span className="text-[11px] text-white/45">
              Ready when you start
            </span>
          )}
        </div>
      </div>
      {inFlight ? null : (
        <p className="mt-2 text-[12px] leading-snug text-white/40">
          Your agent wallet is ready when you start. Add SOL on the agent
          anytime after.
        </p>
      )}
    </div>
  );
}

function ConfirmLiveDialog({ phase }: { phase: Phase }) {
  const busy = phase === "starting" || phase === "approve";
  return (
    <div
      className={clsx(
        "w-full max-w-sm overflow-hidden rounded-2xl",
        PAGE_TOUR_CARD_SHELL_CLASS,
      )}
    >
      <div className="flex h-32 items-end justify-center rounded-t-2xl bg-(--color-button-darkest) pb-2 pt-6 sm:h-36">
        <SpawnGlassCubeIcon variant="surprise" wink className="size-24 sm:size-28" />
      </div>

      <div className="px-4 pb-5 pt-5 sm:px-5 sm:pb-6">
        <p className="text-[17px] font-semibold leading-snug tracking-tight text-white">
          Go live with real SOL
        </p>
        <p className="mt-2 text-[11px] text-white/45">
          Promoting: {BOT_NAME} · +18.4% over 30 paper trades
        </p>

        <ul className="mt-4 space-y-2.5">
          {GO_LIVE_BULLETS_WALLET.map((text) => (
            <li
              key={text}
              className="flex items-start gap-2.5 text-[13px] leading-snug text-white/60"
            >
              <AiChatCheckIcon className="mt-0.5 size-3.5 shrink-0 text-[#4D68FF]" />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <GoLiveWalletRow phase={phase} />

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <span
            className={clsx(
              "ui-button--surface flex h-10 w-full items-center justify-center rounded-[8px] px-3 text-[13px] font-medium",
              busy && "opacity-40",
            )}
          >
            Cancel
          </span>
          <span
            data-cursor-target="start-live"
            className={clsx(
              "flex h-10 w-full items-center justify-center whitespace-nowrap rounded-[8px] px-2 text-[13px] font-medium transition-transform duration-150",
              BUTTON_PRIMARY_GRADIENT_CLASS,
              phase === "starting" && "scale-[0.97]",
            )}
          >
            {busy ? "Starting…" : "Start Live Trading"}
          </span>
        </div>
      </div>
    </div>
  );
}

function PaperStage({ pressed }: { pressed: boolean }) {
  return (
    <div className="flex w-full max-w-[300px] flex-col gap-3">
      <BotUnitCard
        bot={PAPER_BOT}
        badge={<BotUnitPaperBadge />}
        hideFooterAction
        className="h-[168px]"
      />
      <span
        data-cursor-target="go-live"
        className={clsx(
          "flex h-10 w-full items-center justify-center rounded-[8px] text-[13px] font-medium transition-transform duration-150",
          BUTTON_PRIMARY_GRADIENT_CLASS,
          pressed && "scale-[0.97]",
        )}
      >
        Go Live
      </span>
    </div>
  );
}

function LiveStage({ animate }: { animate: boolean }) {
  return (
    <div className="flex w-full max-w-[300px] flex-col gap-3">
      <BotUnitCard
        bot={LIVE_BOT}
        badge={<BotUnitLiveBadge />}
        fundBeam={animate}
        className="h-[168px]"
      />
    </div>
  );
}

type CursorState = { x: number; y: number; visible: boolean; jump: boolean };

const CURSOR_SPRING = { stiffness: 120, damping: 18, mass: 0.85 } as const;

const SPARK_ANGLES = [0, 60, 120, 180, 240, 300] as const;

function ClickBurst() {
  return (
    <>
      <motion.span
        className="absolute -left-5 -top-5 size-10 rounded-full border-2 border-[#4D68FF]"
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 1.7, opacity: 0 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      />
      <motion.span
        className="absolute -left-3 -top-3 size-6 rounded-full border border-white/80"
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
      />
      {SPARK_ANGLES.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <motion.span
            key={deg}
            className="absolute -left-[2px] -top-[2px] size-1 rounded-full bg-[#9DB0FF] shadow-[0_0_6px_#4D68FF]"
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: Math.cos(rad) * 22,
              y: Math.sin(rad) * 22,
              scale: 0.3,
              opacity: 0,
            }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

function DemoCursor({
  cursor,
  pressed,
  clickId,
}: {
  cursor: CursorState;
  pressed: boolean;
  clickId: number;
}) {
  const gradientId = `cursor-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const x = useSpring(cursor.x, CURSOR_SPRING);
  const y = useSpring(cursor.y, CURSOR_SPRING);
  const tilt = useSpring(
    useTransform(useVelocity(x), [-1400, 0, 1400], [-16, 0, 16]),
    { stiffness: 260, damping: 26 },
  );

  useEffect(() => {
    if (cursor.jump) {
      x.jump(cursor.x);
      y.jump(cursor.y);
    } else {
      x.set(cursor.x);
      y.set(cursor.y);
    }
  }, [cursor, x, y]);

  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-20"
      style={{ x, y }}
      initial={false}
      animate={{ opacity: cursor.visible ? 1 : 0 }}
      transition={{ duration: 0.25 }}
    >
      {clickId > 0 ? <ClickBurst key={clickId} /> : null}

      <motion.div
        style={{ rotate: tilt, originX: 0, originY: 0 }}
        animate={{ scale: pressed ? 0.82 : 1 }}
        transition={{ type: "spring", stiffness: 600, damping: 22 }}
        className="relative"
      >
        <svg
          width="24"
          height="26"
          viewBox="0 0 22 24"
          fill="none"
          className="-ml-[1.5px] -mt-[1.5px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="2"
              y1="1"
              x2="13"
              y2="20"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#A9B8FF" />
              <stop offset="0.45" stopColor="#4D68FF" />
              <stop offset="1" stopColor="#0047D6" />
            </linearGradient>
          </defs>
          <path
            d="M1.5 1.5V17.9L5.8 13.8L8.5 20L11.2 18.8L8.5 12.7H14.5L1.5 1.5Z"
            fill={`url(#${gradientId})`}
            stroke="#FFFFFF"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>

        <span className="absolute left-[15px] top-[20px] whitespace-nowrap rounded-full rounded-tl-[4px] bg-linear-to-br from-[#5B74FF] to-[#0047D6] px-2 py-[3px] text-[11px] font-semibold leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.35)]">
          You
        </span>
      </motion.div>
    </motion.div>
  );
}

export function GoLivePreview({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduceMotion = useReducedMotion();
  const animate = inView && !reduceMotion;
  const [step, setStep] = useState(0);
  const [cursor, setCursor] = useState<CursorState>({
    x: 0,
    y: 0,
    visible: false,
    jump: true,
  });
  const [pressed, setPressed] = useState(false);
  const [clickId, setClickId] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const id = window.setTimeout(
      () => setStep((s) => (s + 1) % PHASES.length),
      PHASES[step].ms,
    );
    return () => window.clearTimeout(id);
  }, [animate, step]);

  const phase: Phase = reduceMotion ? "confirm" : PHASES[step].phase;
  const stage =
    phase === "paper" ? "paper" : phase === "live" ? "live" : "dialog";

  useEffect(() => {
    if (!animate) return;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) =>
      timers.push(window.setTimeout(fn, ms));

    // Waits for the target to mount and stop moving (stage enter animation,
    // dialog height changes) before aiming at it.
    const moveTo = (target: string, then?: () => void) => {
      let last = "";
      let tries = 0;
      const poll = () => {
        const root = ref.current;
        const el = root?.querySelector<HTMLElement>(
          `[data-cursor-target="${target}"]`,
        );
        if (root && el) {
          const r = root.getBoundingClientRect();
          const t = el.getBoundingClientRect();
          const x = Math.round(t.left - r.left + t.width * 0.58);
          const y = Math.round(t.top - r.top + t.height * 0.62);
          const key = `${x},${y},${Math.round(t.width)}`;
          if (key === last) {
            setCursor({ x, y, visible: true, jump: false });
            then?.();
            return;
          }
          last = key;
        }
        if (++tries < 40) at(70, poll);
      };
      poll();
    };

    const click = () => {
      setPressed(true);
      setClickId((c) => c + 1);
      at(150, () => setPressed(false));
    };

    if (phase === "paper") {
      at(120, () => {
        const root = ref.current;
        if (!root) return;
        setCursor((c) =>
          c.visible
            ? c
            : {
                x: root.clientWidth * 0.82,
                y: root.clientHeight * 0.9,
                visible: true,
                jump: true,
              },
        );
      });
      at(300, () => moveTo("go-live", () => at(1150, click)));
    } else if (phase === "confirm") {
      at(300, () => moveTo("start-live", () => at(1050, click)));
    } else if (phase === "starting") {
      at(40, () => moveTo("start-live"));
    } else if (phase === "live") {
      at(300, () => moveTo("add-balance"));
    }

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [animate, phase]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={clsx(
        "relative flex h-full w-full flex-col items-center justify-center gap-6",
        className,
      )}
    >
      <EnvironmentToggle env={phase === "live" ? "live" : "paper"} />

      <div className="flex min-h-[470px] w-full items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stage}
            className="flex w-full justify-center"
            initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {stage === "paper" ? (
              <PaperStage pressed={pressed} />
            ) : stage === "live" ? (
              <LiveStage animate={animate} />
            ) : (
              <ConfirmLiveDialog phase={phase} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {animate ? (
        <DemoCursor cursor={cursor} pressed={pressed} clickId={clickId} />
      ) : null}
    </div>
  );
}
