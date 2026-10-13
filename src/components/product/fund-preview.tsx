"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import NumberFlow, { continuous } from "@number-flow/react";
import { useInView, useReducedMotion } from "motion/react";

import SolanaIcon from "./icons/solana-icon";

const BUY_SOL = 0.1;
const POOL_SOL = 12;
const CURRENT_BALANCE = "5.12 SOL";

/** trenchers_fe `fundQuickPresetLadderLamports`, in SOL. */
function fundLadder(buySol: number, maxSol: number) {
  const min = buySol * 2;
  const span = maxSol - min;
  return [
    { label: "Min", sol: min },
    { label: "Mid", sol: min + span / 3 },
    { label: "High", sol: min + (2 * span) / 3 },
    { label: "Max", sol: maxSol },
  ];
}

const PRESETS = fundLadder(BUY_SOL, POOL_SOL);
const STEP_MS = 1900;

function solLabel(sol: number) {
  return Number(sol.toFixed(3)).toString();
}

const PRESET_CHIP_CLASS =
  "relative min-h-8 min-w-0 w-full rounded-[8px] px-1.5 py-2 text-[12px] leading-tight text-white/85 transition-colors";

const PRESET_CHIP_LAYER_CLASS =
  "absolute inset-0 flex items-center justify-center px-1 transition-[opacity,transform] duration-200 ease-out";

/** Fund dialog (`BotAllocateDialog`), Paper arm, Fund tab. */
export function FundPreview({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduceMotion = useReducedMotion();
  const [picked, setPicked] = useState<number | null>(reduceMotion ? 1 : null);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const id = window.setInterval(() => {
      setPicked((i) => (i === null ? 0 : (i + 1) % PRESETS.length));
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [inView, reduceMotion]);

  const amount = picked === null ? 0 : Number(PRESETS[picked].sol.toFixed(9));

  return (
    <div
      ref={ref}
      aria-hidden
      className={clsx(
        "w-full max-w-[360px] select-none overflow-hidden rounded-2xl bg-[#0A0A0A] shadow-[0_20px_50px_rgba(0,0,0,0.55)]",
        className,
      )}
    >
      <div className="space-y-3 px-2.5 pb-3 pt-2.5">
        <div className="ui-surface-tour-card overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
          <div className="grid grid-cols-2 border-b border-white/8">
            <span className="relative bg-white/[0.04] px-3 py-3 text-center text-[13px] text-white">
              Fund
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white" />
            </span>
            <span className="px-3 py-3 text-center text-[13px] text-white/45">
              Withdraw
            </span>
          </div>

          <div className="px-4 pb-4 pt-3.5">
            <div className="flex flex-col items-center py-8 md:py-10">
              <div className="flex w-full max-w-[20rem] items-center justify-center text-[44px] leading-none tracking-tight text-white">
                <NumberFlow
                  value={amount}
                  locales="en-US"
                  format={{
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 3,
                    useGrouping: false,
                  }}
                  plugins={[continuous]}
                  animated={!reduceMotion}
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    ["--number-flow-mask-height" as string]: "0.15em",
                  }}
                />
              </div>
              <div className="mt-2 text-center text-[13px] tabular-nums">
                <p className="text-white/40">Current balance</p>
                <p className="inline-flex items-center justify-center gap-1.5 text-white/40">
                  <SolanaIcon className="size-3.5 shrink-0" />
                  <span>{CURRENT_BALANCE}</span>
                </p>
              </div>
            </div>

            <div className="mt-1 grid grid-cols-4 gap-2">
              {PRESETS.map((preset, i) => {
                const active = picked === i;
                return (
                  <span
                    key={preset.label}
                    className={clsx(
                      PRESET_CHIP_CLASS,
                      active ? "bg-white/[0.1]" : "bg-white/[0.06]",
                    )}
                  >
                    <span
                      className={clsx(
                        PRESET_CHIP_LAYER_CLASS,
                        active ? "scale-90 opacity-0" : "scale-100 opacity-100",
                      )}
                    >
                      <span className="truncate">{preset.label}</span>
                    </span>
                    <span
                      className={clsx(
                        PRESET_CHIP_LAYER_CLASS,
                        "gap-0.5",
                        active ? "scale-100 opacity-100" : "scale-90 opacity-0",
                      )}
                    >
                      <SolanaIcon className="size-3 shrink-0" />
                      <span className="min-w-0 max-w-full truncate text-[10px] tabular-nums text-white/80">
                        {solLabel(preset.sol)}
                      </span>
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-1">
          <div className="flex min-h-[40px] w-full min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-semibold text-white/90">
                Paper pool
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[12px] tabular-nums text-white/70">
                <SolanaIcon className="size-3 shrink-0" />
                <span>{POOL_SOL} SOL available</span>
              </span>
            </span>
          </div>
        </div>

        <span className="ui-button--surface flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-[8px] p-0 text-[14px]">
          Add balance
        </span>
      </div>
    </div>
  );
}
