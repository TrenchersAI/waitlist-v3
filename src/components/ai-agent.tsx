"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import useMeasure from "react-use-measure";
import DepositIcon from "@/src/ui/deposit-icon";
import SolanaIcon from "@/src/ui/solana-icon";

export default function AIAgent() {
  return (
    <div className="relative mx-auto flex h-full w-full max-w-[420px] flex-col items-center justify-center">
      <MorphSurface />
    </div>
  );
}

const SPEED = 1.4;

/** Auto-cycle Buy/Market ↔ Sell/Limit in the terminal demo (time between flips). */
const AUTO_TAB_CYCLE_MS = Math.round(4000 / SPEED);

interface FooterContext {
  showFeedback: boolean;
  success: boolean;
  openFeedback: () => void;
  closeFeedback: () => void;
}

const FooterContext = React.createContext({} as FooterContext);
const useFooter = () => React.useContext(FooterContext);

export function MorphSurface() {
  const rootRef = React.useRef<HTMLDivElement>(null);

  const feedbackRef = React.useRef<HTMLInputElement | null>(null);
  const showFeedback = true;
  const success = false;

  function closeFeedback() {}

  function openFeedback() {}

  const context = React.useMemo(
    () => ({
      showFeedback,
      success,
      openFeedback,
      closeFeedback,
    }),
    [],
  );

  return (
    <div
      // TODO move out
      className="z-20 flex w-full items-end justify-center"
      style={{
        maxWidth: FEEDBACK_WIDTH,
        minHeight: FEEDBACK_HEIGHT,
        height: "auto",
      }}
    >
      <div
        data-footer
        ref={rootRef}
        className={
          "terminal-panel-bg shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_15px_-3px_rgba(0,0,0,0.45),0_4px_6px_-4px_rgba(0,0,0,0.35)] relative bottom-8 z-3 flex w-full flex-col items-center overflow-hidden shadow-menu max-sm:bottom-5"
        }
        style={{
          maxWidth: FEEDBACK_WIDTH,
          minHeight: FEEDBACK_HEIGHT,
          height: "auto",
          borderRadius: 14,
        }}
      >
        <FooterContext value={context}>
          <TerminalTradingForm ref={feedbackRef} />
        </FooterContext>
      </div>
    </div>
  );
}

///////////////////////////////////////////////////////////////////////////////////////

type TerminalTradingFormProps = {
  /** Optional wrapper classes (e.g. max width on a standalone page). */
  className?: string;
  /** Token symbol shown on the primary CTA. */
  tokenSymbol?: string;
  /** Called when user presses the main trade action button. */
  onSuccess?: () => void;
};

/**
 * Buy/Sell trading widget (Market / Limit / Adv., amount, quick amounts, advanced strategy, primary CTA).
 * Extracted for reuse and isolated demo routes.
 */
const TerminalTradingForm = React.forwardRef<
  HTMLInputElement,
  TerminalTradingFormProps
>(function TerminalTradingForm({ className = "" }: TerminalTradingFormProps, ref) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit" | "advanced">(
    "market",
  );
  const [advancedStrategyEnabled, setAdvancedStrategyEnabled] = useState(false);
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [amount, setAmount] = useState("");
  const [quickAmounts, setQuickAmounts] = useState(["0.01", "0.1", "1", "10"]);
  const [isEditingQuickAmounts, setIsEditingQuickAmounts] = useState(false);
  const [marketCap, setMarketCap] = useState("2327");
  const [limitPercent, setLimitPercent] = useState(0);
  const [advancedTab, setAdvancedTab] = useState<
    "migration" | "dev-sell" | "dca"
  >("migration");
  const [pauseAutoTabs, setPauseAutoTabs] = useState(false);
  const [measureRef, bounds] = useMeasure();
  /** Pause the 4 s auto-cycle when the widget is scrolled out of view.
     it lives in the desktop right column and otherwise re-renders the
     surrounding tree forever as the user scrolls down the page. The 200 px
     margin keeps the demo lively the moment it scrolls back into view. */
  const formRef = useRef<HTMLFormElement>(null);
  const inView = useInView(formRef, { margin: "200px" });

  useEffect(() => {
    if (!inView || orderType === "advanced" || pauseAutoTabs) return;
    const id = window.setInterval(() => {
      setSide((s) => {
        const next = s === "buy" ? "sell" : "buy";
        setOrderType(next === "buy" ? "market" : "limit");
        return next;
      });
    }, AUTO_TAB_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [inView, orderType, pauseAutoTabs]);

  function selectBuy() {
    setSide("buy");
    setOrderType("market");
  }

  function selectSell() {
    setSide("sell");
    setOrderType("limit");
  }

  function selectMarket() {
    setOrderType("market");
    setSide("buy");
  }

  function selectLimit() {
    setOrderType("limit");
    setSide("sell");
  }

  function selectAdvanced() {
    setOrderType("advanced");
  }

  const shellHeight =
    bounds.height > 0 ? bounds.height : FEEDBACK_HEIGHT;

  return (
    <form
      ref={formRef}
      className="relative w-full"
      style={{
        maxWidth: FEEDBACK_WIDTH,
        pointerEvents: "all",
      }}
      onSubmit={(e) => e.preventDefault()}
      onMouseEnter={() => setPauseAutoTabs(true)}
      onMouseLeave={() => setPauseAutoTabs(false)}
    >
      <motion.div
        className="w-full overflow-hidden bg-transparent"
        animate={{ height: shellHeight }}
        transition={{
          type: "spring",
          bounce: 0.28,
          stiffness: 260,
          damping: 26,
        }}
      >
        <div
          ref={measureRef}
          className={`relative w-full space-y-2 rounded-none p-3 pb-3.5 max-sm:p-2.5 ${className}`}
        >
            <div className="grid grid-cols-2 gap-1 rounded-md border border-white/8 bg-black/25 p-1">
              <button
                type="button"
                onClick={selectBuy}
                className={`rounded py-1.5 text-sm font-medium transition-colors ${
                  side === "buy"
                    ? "bg-[#2FE0E3] text-black"
                    : "bg-transparent text-white/70"
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={selectSell}
                className={`rounded py-1.5 text-sm font-medium transition-colors ${
                  side === "sell"
                    ? "bg-[#D73540] text-white"
                    : "bg-transparent text-white/70"
                }`}
              >
                Sell
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-y-1">
              <div className="flex items-center gap-4 text-xs sm:gap-5">
                <button
                  type="button"
                  onClick={selectMarket}
                  aria-pressed={orderType === "market"}
                  className={`py-0.5 transition-colors ${
                    orderType === "market"
                      ? "font-semibold text-white"
                      : "font-medium text-neutral-500 hover:text-white/65"
                  }`}
                >
                  Market
                </button>
                <button
                  type="button"
                  onClick={selectLimit}
                  aria-pressed={orderType === "limit"}
                  className={`py-0.5 transition-colors ${
                    orderType === "limit"
                      ? "font-semibold text-white"
                      : "font-medium text-neutral-500 hover:text-white/65"
                  }`}
                >
                  Limit
                </button>
                <button
                  type="button"
                  onClick={selectAdvanced}
                  aria-pressed={orderType === "advanced"}
                  className={`py-0.5 transition-colors ${
                    orderType === "advanced"
                      ? "font-semibold text-white"
                      : "font-medium text-neutral-500 hover:text-white/65"
                  }`}
                >
                  Adv.
                </button>
              </div>
              <div className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/6 px-2 py-1 text-[11px] font-medium text-white sm:gap-1.5">
                <span className="inline-flex items-center gap-1 ">
                  <DepositIcon className="opacity-50 size-3.5" />
                  <span className="text-neutral-400">3</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-flex h-4 w-4 items-center justify-center text-neutral-400">
                    <SolanaIcon className="size-3.5" />
                  </span>
                  <span className="text-neutral-400">1.2</span>
                </span>
              </div>
            </div>

            {orderType === "advanced" ? (
              <div className="grid grid-cols-3 gap-2 rounded-md border border-white/6 p-1.5">
                <button
                  type="button"
                  onClick={() => setAdvancedTab("migration")}
                  className={`rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors ${
                    advancedTab === "migration"
                      ? "bg-[#4D68FF] text-white"
                      : "text-white/90 hover:bg-white/6"
                  }`}
                >
                  » Migration
                </button>
                <button
                  type="button"
                  onClick={() => setAdvancedTab("dev-sell")}
                  className={`rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors ${
                    advancedTab === "dev-sell"
                      ? "bg-[#4D68FF] text-white"
                      : "text-white/90 hover:bg-white/6"
                  }`}
                >
                  ⌃ Dev Sell
                </button>
                <button
                  type="button"
                  onClick={() => setAdvancedTab("dca")}
                  className={`rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors ${
                    advancedTab === "dca"
                      ? "bg-[#4D68FF] text-white"
                      : "text-white/90 hover:bg-white/6"
                  }`}
                >
                  ◴ DCA
                </button>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-md border border-white/6 bg-black/25">
              <div className="flex items-center justify-between border-b border-white/6 px-3 py-2 text-xs focus-within:rounded-md focus-within:shadow-[inset_0_0_0_1px_#4D68FF]">
                <span className="text-white/45">AMOUNT</span>
                <input
                  ref={ref}
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.0"
                  aria-label="Amount"
                  className="w-16 bg-transparent text-center font-semibold text-white outline-none"
                />
                <span className="inline-flex h-4 w-4 items-center justify-center text-[#4D68FF]">
                  <SolanaIcon className="size-full" />
                </span>
              </div>
              <div className="grid grid-cols-5 text-xs">
                {quickAmounts.map((quickAmount, index) =>
                  isEditingQuickAmounts ? (
                    <div
                      key={`edit-${index}`}
                      className="border-r border-white/6 px-1 last:border-r-0"
                    >
                      <input
                        type="text"
                        inputMode="decimal"
                        value={quickAmount}
                        onChange={(event) =>
                          setQuickAmounts((current) =>
                            current.map((value, currentIndex) =>
                              currentIndex === index
                                ? event.target.value
                                : value,
                            ),
                          )
                        }
                        aria-label={`Quick amount ${index + 1}`}
                        className="w-full rounded-sm border border-transparent bg-transparent py-1.5 text-center text-white/90 outline-none focus:border-[#4D68FF] focus:ring-1 focus:ring-[#4D68FF]/50"
                      />
                    </div>
                  ) : (
                    <button
                      key={`value-${index}`}
                      type="button"
                      onClick={() => setAmount(quickAmount)}
                      className="border-r border-white/6 py-1.5 text-white/90 last:border-r-0"
                    >
                      {quickAmount}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() =>
                    setIsEditingQuickAmounts((editing) => !editing)
                  }
                  aria-label={
                    isEditingQuickAmounts
                      ? "Save quick amounts"
                      : "Edit quick amounts"
                  }
                  className="py-1.5 text-white/70"
                >
                  {isEditingQuickAmounts ? "✓" : "✎"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-white/50">
              <span>⚒ 20%</span>
              <span>⌗ 0.001</span>
              <span className="text-[#f6c64d]">◉ 0.01</span>
              <span>◬ Off</span>
            </div>

            {orderType === "limit" ? (
              <>
                <div className="flex items-center justify-between rounded-md border border-white/6 px-4 py-2 text-xs focus-within:shadow-[inset_0_0_0_1px_#4D68FF]">
                  <span className="text-white/50">MKT CAP</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={marketCap}
                    onChange={(event) => setMarketCap(event.target.value)}
                    aria-label="Market cap"
                    className="w-24 bg-transparent text-center font-semibold text-white outline-none"
                  />
                  <span className="text-xs font-semibold text-white ">$</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      step={1}
                      value={limitPercent}
                      onChange={(event) =>
                        setLimitPercent(Number(event.target.value))
                      }
                      className="h-1 w-full accent-[#4D68FF]"
                    />
                    <div className="mt-1 flex items-center justify-between text-[10px] text-white/85">
                      <span>-100%</span>
                      <span>-50%</span>
                      <span>0%</span>
                      <span>+50%</span>
                      <span>+100%</span>
                    </div>
                  </div>

                  <div className="inline-flex w-16 items-center justify-between rounded-md border border-white/6 px-2 py-1.5 text-white">
                    <span>{limitPercent}</span>
                    <span>%</span>
                  </div>
                </div>
              </>
            ) : null}

            {orderType === "market" ? (
              <>
                <div className="mt-6 flex items-center justify-between text-xs text-white/85">
                  <span>Advanced Trading Strategy</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAdvancedStrategyEnabled((enabled) => {
                        const nextEnabled = !enabled;
                        if (!nextEnabled) {
                          setShowAdvancedMenu(false);
                        }
                        return nextEnabled;
                      })
                    }
                    aria-label="Toggle advanced trading strategy"
                    aria-pressed={advancedStrategyEnabled}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full border border-white/6 transition-colors ${
                      advancedStrategyEnabled
                        ? "bg-[#464650] border border-white/15"
                        : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`inline-block size-3 transform rounded-full bg-white transition-transform ${
                        advancedStrategyEnabled
                          ? "translate-x-5"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {advancedStrategyEnabled ? (
                  <div className="relative">
                    <div className="flex items-center justify-between rounded-md border border-white/6 bg-black/25 px-3 py-2 text-[#4D68FF]">
                      <button
                        type="button"
                        onClick={() => setShowAdvancedMenu((open) => !open)}
                        className="text-sm font-medium"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAdvancedMenu((open) => !open)}
                        aria-label="Toggle advanced strategy options"
                        aria-expanded={showAdvancedMenu}
                        className="text-xl leading-none text-white/70"
                      >
                        +
                      </button>
                    </div>

                    {showAdvancedMenu ? (
                      <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-full overflow-hidden rounded-md border border-white/6 bg-[#12141d] shadow-lg shadow-black/40">
                        {[
                          "Take Profit",
                          "Stop loss",
                          "Trailing Stop Loss",
                          "Dev Sell",
                          "Migration",
                        ].map((option) => (
                          <button
                            key={option}
                            type="button"
                            className="flex w-full items-center px-3 py-2 text-left text-sm text-white/80 hover:bg-white/6 hover:text-white"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}

        </div>
      </motion.div>
    </form>
  );
});

///////////////////////////////////////////////////////////////////////////////////////

/** Align with `TokenList` column (`max-w-[420px]` in `hero.tsx`). */
const FEEDBACK_WIDTH = 390;
const FEEDBACK_HEIGHT = 250;

function Feedback({
  ref,
  onSuccess,
}: {
  ref: React.Ref<HTMLTextAreaElement>;
  onSuccess: () => void;
}) {
  const { closeFeedback, showFeedback } = useFooter();
  const submitRef = React.useRef<HTMLButtonElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSuccess();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      closeFeedback();
    }
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      submitRef.current?.click();
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="absolute bottom-0"
      style={{
        width: FEEDBACK_WIDTH,
        height: FEEDBACK_HEIGHT,
        pointerEvents: showFeedback ? "all" : "none",
      }}
    >
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 550 / SPEED,
              damping: 45,
              mass: 0.7,
            }}
            className="p-5 bg-[#0B0C0D] flex flex-col h-full shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_15px_-3px_rgba(0,0,0,0.5),0_4px_6px_-4px_rgba(0,0,0,0.4)]"
          >
            <div className="flex gap-2 items-center justify-center w-full">
              <IconContainer>
                <SearchIcon />
              </IconContainer>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-start gap-1 justify-center flex-col">
                  <span className="text-xs text-neutral-100">
                    Parse trade intent
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Pairs, direction, size, and strategy from your prompt
                  </span>
                </div>
                <div className="size-5 rounded-full bg-emerald-950/90 ring-1 ring-emerald-500/35 flex items-center justify-center">
                  <TickIcon />
                </div>
              </div>
            </div>

            <div className="w-px border h-full ml-5 border-dashed border-neutral-700"></div>

            <div className="flex gap-2 items-center justify-center w-full">
              <IconContainer>
                <DatabaseIcon />
              </IconContainer>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-start gap-1 justify-center flex-col">
                  <span className="text-xs text-neutral-100">
                    Pull market context
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Liquidity, volatility, and smart-money flows
                  </span>
                </div>
                <div className="size-5 rounded-full bg-blue-950/90 ring-1 ring-[#455EFF]/40 flex items-center justify-center">
                  <LoaderIcon className="animate-spin [animation-duration:1.2s]" />
                </div>
              </div>
            </div>

            <div className="w-px border h-full ml-5 border-dashed border-neutral-200"></div>

            <div className="flex gap-2 items-center justify-center w-full opacity-55 ">
              <IconContainer>
                <FlashIcon />
              </IconContainer>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-start gap-1 justify-center flex-col">
                  <span className="text-xs text-neutral-100">
                    Plan execution
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Route, slippage limits, and risk guardrails
                  </span>
                </div>
                <div className="px-1 py-0.5 text-[10px] rounded-full text-neutral-400 bg-neutral-800 flex items-center justify-center">
                  Standby
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
///////////////////////////////////////////////////////////////////////////////////////

function FlashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path
        d="M1.99975 6.99935C1.90513 6.99967 1.81237 6.97314 1.73223 6.92284C1.65209 6.87254 1.58787 6.80053 1.54703 6.71518C1.50618 6.62983 1.4904 6.53464 1.5015 6.44068C1.5126 6.34671 1.55014 6.25783 1.60975 6.18435L6.55975 1.08435C6.59688 1.04149 6.64748 1.01253 6.70324 1.00222C6.759 0.991904 6.81661 1.00086 6.86662 1.0276C6.91662 1.05435 6.95604 1.0973 6.97842 1.1494C7.00079 1.20151 7.00479 1.25967 6.98975 1.31435L6.02975 4.32435C6.00144 4.40011 5.99194 4.48161 6.00205 4.56185C6.01216 4.6421 6.04158 4.71869 6.0878 4.78506C6.13401 4.85144 6.19564 4.90561 6.26739 4.94293C6.33914 4.98025 6.41887 4.99961 6.49975 4.99935H9.99975C10.0944 4.99903 10.1871 5.02556 10.2673 5.07586C10.3474 5.12616 10.4116 5.19817 10.4525 5.28352C10.4933 5.36887 10.5091 5.46406 10.498 5.55802C10.4869 5.65198 10.4494 5.74087 10.3898 5.81435L5.43975 10.9143C5.40262 10.9572 5.35202 10.9862 5.29626 10.9965C5.2405 11.0068 5.18289 10.9978 5.13289 10.9711C5.08288 10.9444 5.04346 10.9014 5.02108 10.8493C4.99871 10.7972 4.99471 10.739 5.00975 10.6844L5.96975 7.67435C5.99806 7.59859 6.00757 7.51709 5.99746 7.43685C5.98735 7.3566 5.95792 7.28001 5.91171 7.21364C5.86549 7.14726 5.80387 7.09309 5.73211 7.05577C5.66036 7.01845 5.58063 6.99909 5.49975 6.99935H1.99975Z"
        stroke="#a3a3a3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoaderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      {...props}
    >
      <path
        d="M5.05078 1.09108C5.67829 0.96964 6.32327 0.96964 6.95078 1.09108"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.95078 10.9092C6.32327 11.0306 5.67829 11.0306 5.05078 10.9092"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.80469 1.86035C9.33542 2.21996 9.79205 2.67829 10.1497 3.21035"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.09108 6.9498C0.96964 6.32229 0.96964 5.67732 1.09108 5.0498"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.1391 8.80469C9.77945 9.33542 9.32113 9.79205 8.78906 10.1497"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.9082 5.0498C11.0296 5.67732 11.0296 6.32229 10.9082 6.9498"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.86133 3.19559C2.22094 2.66485 2.67926 2.20823 3.21133 1.85059"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.19461 10.1391C2.66387 9.77945 2.20725 9.32113 1.84961 8.78906"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TickIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
    >
      <path
        d="M10 3L4.5 8.5L2 6"
        stroke="#009966"
        strokeWidth="1.05"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="size-9 rounded-lg bg-[linear-gradient(180deg,#1c1c1f_0%,#0f0f12_100%)] flex items-center justify-center shadow-[0_0_0_3px_rgba(255,255,255,0.04)_inset,0_0_0_1px_rgba(255,255,255,0.08),0_4px_6px_-1px_rgba(0,0,0,0.45),0_2px_4px_-2px_rgba(0,0,0,0.35)]">
      {children}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width="16px"
      height="16px"
      viewBox="0 0 24 24"
    >
      <line
        x1="20.5"
        y1="20.5"
        x2="15"
        y2="15"
        fill="none"
        stroke="#d4d4d8"
        strokeLinecap="square"
        strokeMiterlimit="10"
        strokeWidth="2"
        data-color="color-2"
      ></line>
      <circle
        cx="10"
        cy="10"
        r="7"
        fill="none"
        stroke="#d4d4d8"
        strokeLinecap="square"
        strokeMiterlimit="10"
        strokeWidth="2"
      ></circle>
    </svg>
  );
}

function DatabaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width="16px"
      height="16px"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        d="m3,5v14c0,1.7,4,3,9,3s9-1.3,9-3V5"
        fill="none"
        stroke="#6B7FFF"
        strokeMiterlimit="10"
        strokeWidth="2"
        data-cap="butt"
      ></path>
      <ellipse
        cx="12"
        cy="5"
        rx="9"
        ry="3"
        fill="none"
        stroke="#6B7FFF"
        strokeLinecap="square"
        strokeMiterlimit="10"
        strokeWidth="2"
        data-color="color-2"
      ></ellipse>
      <path
        d="m21,12c0,1.7-4,3-9,3s-9-1.3-9-3"
        fill="none"
        stroke="#6B7FFF"
        strokeLinecap="square"
        strokeMiterlimit="10"
        strokeWidth="2"
      ></path>
    </svg>
  );
}

function Anthropic() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path
        d="M9.77927 2.91699H7.8496L11.3047 11.667H13.1889L9.77927 2.91699ZM4.21485 2.91699L0.804688 11.667H2.73435L3.49677 9.82716H7.0866L7.8041 11.6221H9.73435L6.23435 2.91699H4.21485ZM4.03519 8.21191L5.20185 5.11558L6.41344 8.21191H4.03519Z"
        fill="#e5e5e5"
      />
    </svg>
  );
}

function CursorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
    >
      <path
        d="M7 2.0498L6 2.9998"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.54961 3.99961L1.09961 3.59961"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.9998 6L2.0498 7"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.59961 1.09961L3.99961 2.54961"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.51882 4.84532C4.49943 4.79965 4.49413 4.74922 4.5036 4.70051C4.51307 4.65181 4.53687 4.60704 4.57195 4.57195C4.60704 4.53687 4.65181 4.51307 4.70051 4.5036C4.74922 4.49413 4.79965 4.49943 4.84532 4.51882L10.3453 6.76882C10.3943 6.7889 10.4356 6.824 10.4633 6.86905C10.4911 6.91411 10.5038 6.9668 10.4997 7.01955C10.4956 7.0723 10.4748 7.12238 10.4404 7.16259C10.406 7.2028 10.3598 7.23107 10.3083 7.24332L8.13382 7.76382C8.04405 7.78526 7.96197 7.83113 7.89667 7.89635C7.83136 7.96156 7.78538 8.04358 7.76382 8.13332L7.24382 10.3083C7.2317 10.36 7.20347 10.4064 7.1632 10.441C7.12294 10.4755 7.07273 10.4963 7.01984 10.5005C6.96696 10.5046 6.91413 10.4918 6.869 10.4639C6.82387 10.436 6.78879 10.3945 6.76882 10.3453L4.51882 4.84532Z"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
