"use client";

import { useState } from "react";
import { BorderBeam } from "border-beam";
import clsx from "clsx";

const INSIGHTS_TABS = ["Market Intel", "Risk Alerts", "Execution"] as const;
type InsightsTab = (typeof INSIGHTS_TABS)[number];

export default function AIInsights() {
  const [insightsTab, setInsightsTab] = useState<InsightsTab>("Market Intel");

  return (
    <BorderBeam
      size="line"
      theme="dark"
      colorVariant="ocean"
      duration={2.4}
      strength={0.72}
      borderRadius={12}
      className="relative flex h-[180px] w-full max-w-[420px] min-w-0 shrink-0 flex-col transform-[rotate(180deg)]"
    >
      <div className="flex min-h-0 flex-1 rounded-xl bg-linear-to-tl from-white/6 via-white/1 to-transparent p-px transform-[rotate(180deg)]">
        <div className="flex min-h-0 flex-1 rounded-[12px] bg-linear-to-br from-white/13 via-white/8 to-transparent p-px">
          <section className="relative flex h-full min-h-0 flex-1 min-w-0 rounded-[11px] bg-[#121212] px-4 py-4 text-left">
            <div className="flex min-h-0 w-full flex-1 flex-col text-left">
              <div className="flex items-center justify-between gap-2 pb-2">
                <h3 className="text-xs font-semibold tracking-wide text-white/45">
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
              <div className="mt-3 space-y-3">
                {insightsTab === "Market Intel" ? (
                  <>
                    <p className="text-sm leading-relaxed text-white/82">
                      Your AI agent sees cooling momentum and mixed follow-through
                      in recent fills.
                    </p>
                    {/* <p className="text-sm leading-relaxed text-white/70">
                      Suggested action: keep current size until a cleaner
                      breakout confirms direction.
                    </p>
                    <p className="text-[11px] text-white/38">
                      Summarized from market telemetry and fill progression.
                    </p> */}
                  </>
                ) : insightsTab === "Risk Alerts" ? (
                  <>
                    <p className="text-sm leading-relaxed text-white/82">
                      Volatility spikes and brief liquidity gaps are increasing
                      slippage exposure during high-velocity moves.
                    </p>
                    <p className="text-sm leading-relaxed text-white/70">
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
                    <p className="text-sm leading-relaxed text-white/82">
                      Routing remains efficient overall, but partial fills rise
                      under bursty traffic and rapid reversals.
                    </p>
                    <p className="text-sm leading-relaxed text-white/70">
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
          <div className="pointer-events-none absolute inset-x-0 z-50 h-36 -bottom-1 bg-linear-to-t from-[#000000] to-transparent" />
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
