"use client";

import Badge from "./badge";
import PnlGrowth from "./pnl-growth";
import InputFeint from "./input-feint";
import TokenList from "./tokens";
import EmailCapture from "./email-capture";
import Morphing from "./morphing";
import AIAgent from "./ai-agent";

export default function Hero() {
  return (
    <section className="w-full min-h-screen">
      <div className="mx-auto max-w-[1550px] px-4 md:px-6 lg:px-8">
        <div className="flex min-h-screen flex-col items-stretch lg:flex-row">
          <div className="order-2 flex w-full flex-col items-center justify-center gap-4 py-12 lg:order-1 lg:w-1/3 lg:pr-8">
            {/* <InputFeint /> */}
            {/* <PnlGrowth /> */}
            <Morphing />
          </div>

          <div className="relative order-1 flex w-full flex-col items-center justify-center gap-5 border-neutral-900 text-center lg:order-2 lg:w-1/3 lg:border-x">
            {/* <Morphing /> */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col items-center gap-2">
                <Badge text="Coming Q2 2026" />
                <div className="flex flex-col items-center gap-6">
                  <h1 className="text-4xl font-medium text-white md:text-5xl">
                    Trenchers AI
                  </h1>
                  <p className="max-w-[448px] text-sm leading-6 text-neutral-400 md:text-[16px]">
                    Trade like smart money with AI bots that never sleep. Snipe
                    launches, copy whales, and automate trades instantly.
                  </p>
                  <EmailCapture />
                </div>
              </div>
            </div>
          </div>

          <div className="order-3 flex w-full flex-col items-center justify-center gap-6 py-12 lg:w-1/3 lg:pl-8">
            <AIAgent />
            <TokenList className="w-full max-w-[420px]" />
          </div>
        </div>
      </div>
    </section>
  );
}
