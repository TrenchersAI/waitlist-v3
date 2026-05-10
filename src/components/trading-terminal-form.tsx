import { useState } from "react";
import DepositIcon from "@/src/ui/deposit-icon";
import SolanaIcon from "@/src/ui/solana-icon";

type Props = {
  /** Optional wrapper classes (e.g. max width on a standalone page). */
  className?: string;
  /** Token symbol shown on the primary CTA. */
  tokenSymbol?: string;
};

/**
 * Buy/Sell trading widget (Market / Limit / Adv., amount, quick amounts, advanced strategy, primary CTA).
 * Extracted for reuse and isolated demo routes.
 */
export default function TerminalTradingForm({
  className = "",
  tokenSymbol = "ORBITX",
}: Props) {
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

  return (
    <div
      className={`space-y-2 rounded-none bg-(--terminal-bg) p-3 ${className}`}
    >
      <div className="grid grid-cols-2 gap-1 rounded-md bg-(--terminal-bg) p-1">
        <button
          type="button"
          onClick={() => setSide("buy")}
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
          onClick={() => setSide("sell")}
          className={`rounded py-1.5 text-sm font-medium transition-colors ${
            side === "sell"
              ? "bg-[#D73540] text-white"
              : "bg-transparent text-white/70"
          }`}
        >
          Sell
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <button
            type="button"
            onClick={() => setOrderType("market")}
            className={`pb-1 ${
              orderType === "market" ? "text-white" : "text-white/70"
            }`}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => setOrderType("limit")}
            className={`pb-1 ${
              orderType === "limit" ? "text-white" : "text-white/70"
            }`}
          >
            Limit
          </button>
          <button
            type="button"
            onClick={() => setOrderType("advanced")}
            className={`pb-1 ${
              orderType === "advanced" ? "text-white" : "text-white/70"
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

      <div className="overflow-hidden rounded-md border border-white/6 bg-(--terminal-bg)">
        <div className="flex items-center justify-between border-b border-white/6 px-3 py-2 text-xs focus-within:rounded-md focus-within:shadow-[inset_0_0_0_1px_#4D68FF]">
          <span className="text-white/45">AMOUNT</span>
          <input
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
                        currentIndex === index ? event.target.value : value,
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
            onClick={() => setIsEditingQuickAmounts((editing) => !editing)}
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
                  advancedStrategyEnabled ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {advancedStrategyEnabled ? (
            <div className="relative">
              <div className="flex items-center justify-between rounded-md border border-white/6 bg-(--terminal-bg) px-3 py-2 text-[#4D68FF]">
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

      <button
        type="button"
        className={`mt-8 w-full rounded-lg py-2 text-sm font-semibold ${
          side === "buy" ? "bg-[#2FE0E3] text-black" : "bg-[#D73540] text-white"
        }`}
      >
        {side === "buy" ? "Buy" : "Sell"} {tokenSymbol}{" "}
        <span className="inline-flex h-3.5 w-3.5 align-middle">
          <SolanaIcon className="size-full" />
        </span>{" "}
        {amount || "0"}
      </button>
    </div>
  );
}
