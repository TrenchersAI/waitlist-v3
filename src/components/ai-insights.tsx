"use client";

import { useState } from "react";
import { BorderBeam } from "border-beam";
import clsx from "clsx";

const INSIGHTS_TABS = ["Market Intel", "Risk Alerts", "Execution"] as const;
type InsightsTab = (typeof INSIGHTS_TABS)[number];

type AIInsightsProps = {
  /** Extra classes merged onto the outer BorderBeam wrapper. Use this to
     override the default `max-w-[420px]` cap (e.g. `!max-w-none` for an
     edge-to-edge "footer" rendering on mobile). */
  className?: string;
};

export default function AIInsights({ className }: AIInsightsProps) {
  const [insightsTab, setInsightsTab] = useState<InsightsTab>("Market Intel");

  return (
    <BorderBeam
      size="line"
      theme="dark"
      colorVariant="ocean"
      duration={2.4}
      strength={0.72}
      borderRadius={12}
      className={clsx(
        "relative flex min-h-[200px] w-full max-w-[420px] min-w-0 shrink-0 flex-col sm:min-h-[220px] transform-[rotate(180deg)]",
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 rounded-xl bg-linear-to-tl from-white/6 via-white/1 to-transparent p-px transform-[rotate(180deg)]">
        <div className="flex min-h-0 flex-1 flex-col rounded-[12px] bg-linear-to-br from-white/13 via-white/8 to-transparent p-px">
          <section className="relative flex min-h-0 w-full flex-1 flex-col rounded-[11px] bg-[#121212] px-4 py-4 text-left sm:px-5 sm:py-5">
            <div className="flex w-full flex-1 flex-col text-left">
              <div className="flex shrink-0 items-center justify-between gap-2 pb-2 sm:pb-2.5">
                <h3 className="text-xs font-semibold tracking-wide text-white/45 sm:text-[13px]">
                  AI Insights
                </h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="size-3.5 shrink-0 text-white/40"
                  aria-hidden
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <path d="M15 3h6v6" />
                  <path d="M10 14 21 3" />
                </svg>
              </div>
              <div className="mt-2 space-y-2.5 sm:mt-3 sm:space-y-3">
                {insightsTab === "Market Intel" ? (
                  <>
                    <p className="text-sm leading-relaxed text-white/82 sm:text-[15px] sm:leading-relaxed">
                      Your AI agent sees cooling momentum and mixed
                      follow-through in recent fills.
                    </p>
                  </>
                ) : insightsTab === "Risk Alerts" ? (
                  <>
                    <p className="text-sm leading-relaxed text-white/82 sm:text-[15px] sm:leading-relaxed">
                      Volatility spikes and brief liquidity gaps are increasing
                      slippage exposure during high-velocity moves.
                    </p>
                    <p className="text-sm leading-relaxed text-white/70 sm:text-[15px] sm:leading-relaxed">
                      Suggested action: tighten entry filters and avoid size
                      increases in unstable windows.
                    </p>
                    <p className="text-[11px] text-white/38">
                      Derived from risk telemetry, spread drift, and rejection
                      logs.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed text-white/82 sm:text-[15px] sm:leading-relaxed">
                      Routing remains efficient overall, but partial fills rise
                      under bursty traffic and rapid reversals.
                    </p>
                    <p className="text-sm leading-relaxed text-white/70 sm:text-[15px] sm:leading-relaxed">
                      Suggested action: stagger larger orders and prefer lower
                      congestion windows.
                    </p>
                    <p className="text-[11px] text-white/38">
                      Built from route latency, confirmation timing, and retry
                      data.
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
      {/* <div className="mt-3 flex w-full flex-wrap items-center gap-1.5 overflow-hidden px-1"> */}
      {/* {INSIGHTS_TABS.map((tab) => {
          const selected = insightsTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setInsightsTab(tab)}
              className={clsx(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                selected
                  ? "border border-white/10 bg-white/6 text-white/80"
                  : "text-white/45 hover:bg-white/6 hover:text-white/75",
              )}
            >
              {tab}
            </button>
          );
        })} */}
      {/* </div> */}
    </BorderBeam>
  );
}
