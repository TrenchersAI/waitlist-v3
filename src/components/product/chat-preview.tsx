"use client";

import { useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import clsx from "clsx";
import { BorderBeam } from "border-beam";
import { useInView, useReducedMotion } from "motion/react";

import LightningBoltIcon from "./icons/lightning-bolt-icon";
import NeuralGridSpawnIcon from "./icons/neural-grid-spawn-icon";
import ShieldCheckIcon from "./icons/shield-check-icon";
import TradingCurrencyIcon from "./icons/trading-currency-icon";

/** trenchers_fe `AGENT_CREATION_PLACEHOLDER` (`input-feint.tsx`). */
const AGENT_PROMPT =
  "Snipe newly launched Solana tokens with liquidity above $20k and less than 5% held by top wallets.";

/** trenchers_fe side-panel quick start (`PANEL_GENERAL_STARTER`). */
const STARTERS: { label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { label: "Spawn an agent", icon: NeuralGridSpawnIcon },
  { label: "How sniping bots work", icon: LightningBoltIcon },
  { label: "Simulation vs live trading", icon: TradingCurrencyIcon },
  { label: "Risk before you build", icon: ShieldCheckIcon },
];

const TYPE_MS = 28;
const HOLD_MS = 2600;

function useLoopingTypewriter(text: string, active: boolean) {
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (!active) return;
    let timer: number;
    const tick = (next: number) => {
      setLength(next);
      timer =
        next >= text.length
          ? window.setTimeout(() => tick(0), HOLD_MS)
          : window.setTimeout(() => tick(next + 1), next === 0 ? 700 : TYPE_MS);
    };
    tick(0);
    return () => window.clearTimeout(timer);
  }, [text, active]);

  return text.slice(0, length);
}

/** Chat panel quick start + composer, as the app renders a new chat. */
export function ChatPreview({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduceMotion = useReducedMotion();
  const typed = useLoopingTypewriter(AGENT_PROMPT, inView && !reduceMotion);
  const prompt = reduceMotion ? AGENT_PROMPT : typed;

  return (
    <div
      ref={ref}
      aria-hidden
      className={clsx(
        "flex w-full max-w-[27rem] select-none flex-col overflow-hidden rounded-2xl bg-[#0A0A0A] shadow-[0_20px_50px_rgba(0,0,0,0.55)] ring-1 ring-white/8",
        className,
      )}
    >
      <div className="px-5 pb-3 pt-5">
        <div className="text-center">
          <div className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-white/92">
            Welcome back, Trencher.
          </div>
          <p className="mx-auto mt-1 max-w-[21rem] text-balance text-[13px] leading-relaxed text-white/40">
            Ask anything, or spawn a new agent.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {STARTERS.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] py-2 pl-3 pr-3.5 text-[13px] font-medium leading-none text-white/70"
            >
              <Icon className="size-[15px] shrink-0 text-white/35" />
              <span className="whitespace-nowrap">{label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="px-3 pb-3 pt-2">
        <BorderBeam
          size="line"
          theme="dark"
          colorVariant="ocean"
          duration={2.4}
          strength={0.72}
          borderRadius={12}
          active={!reduceMotion}
          className="w-full max-w-full"
        >
          <div className="relative flex w-full items-end gap-2.5 rounded-xl border border-white/8 bg-[#1A1A1A] pb-3 pl-2 pr-3 pt-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="relative min-h-20 flex-1 pb-3.5 pl-1 pr-2 pt-1 text-left text-[13px] leading-snug text-white">
              {prompt}
              {!reduceMotion && prompt.length < AGENT_PROMPT.length ? (
                <span className="ml-px inline-block h-[1.05em] w-px translate-y-[0.15em] animate-pulse bg-white/70" />
              ) : null}
            </div>
            <span
              className={clsx(
                "grid size-8 shrink-0 place-items-center rounded-full border text-white transition-colors duration-150",
                prompt.length > 0
                  ? "border-white/18 bg-transparent"
                  : "border-white/10 bg-white/6 opacity-60",
              )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={16}
                height={16}
                viewBox="0 0 20 20"
                className="shrink-0"
              >
                <line
                  x1="10"
                  y1="17"
                  x2="10"
                  y2="3"
                  fill="none"
                  stroke="#ffffff"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
                <polyline
                  points="15 8 10 3 5 8"
                  fill="none"
                  stroke="#ffffff"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </span>
          </div>
        </BorderBeam>
      </div>
    </div>
  );
}
