"use client";

import { useEffect, useState } from "react";

const FINAL_PNL = 13847;
const FINAL_PERCENT = 24.8;
const STEP_MS = 40;
const DURATION_MS = 2400;

export default function PnlGrowth() {
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    let current = 0;
    const totalSteps = Math.floor(DURATION_MS / STEP_MS);

    const id = setInterval(() => {
      current += 1;
      const next = Math.min(current / totalSteps, 1);
      setProgress(next);

      if (next >= 1) {
        clearInterval(id);
      }
    }, STEP_MS);

    return () => clearInterval(id);
  }, []);

  const pnl = FINAL_PNL * progress;
  const percent = FINAL_PERCENT * progress;

  return (
    <div
      data-mounted={mounted}
      style={{
        transform: mounted ? "translateY(0)" : "translateY(-100%)",
        opacity: mounted ? 1 : 0,
      }}
      className="w-full max-w-[320px] rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-left backdrop-blur opacity-0 -translate-y-full transition-[transform,opacity] duration-[400ms] ease-in-out"
    >
      <p className="text-[11px] uppercase tracking-wider text-zinc-400">
        Live Trader PnL
      </p>
      <div className="mt-1 flex items-end gap-2">
        <span className="text-2xl font-semibold text-white">
          ${pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
        <span className="pb-1 text-sm font-medium text-emerald-400">
          +{percent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
