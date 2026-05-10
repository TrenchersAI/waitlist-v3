"use client";

import clsx from "clsx";
import * as React from "react";
import {
  BotUnitSparklineIcon,
  DepositIcon,
  TotalBalanceIcon,
} from "@/src/ui/icons";
import {
  BOT_UNIT_CARD_FOOTER_CLASSES,
  BOT_UNIT_CARD_SURFACE_CLASSES,
} from "@/src/components/bot-unit-card-styles";

/** Fields used by the grid card and list table (demo data may include more). */
export type BotUnit = {
  id: string;
  name: string;
  pid: string;
  balance: string;
  delta: string;
  trend: string;
  dateLabel: string;
  trades: string;
};

const NEGATIVE_DELTA_COLOR = "#F87171";

function hashUnitId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function parseBalanceUsd(balance: string): number {
  const t = balance.replace(/[$,]/g, "").trim().toLowerCase();
  if (t.endsWith("k")) {
    const n = parseFloat(t.slice(0, -1));
    return Number.isFinite(n) ? n * 1000 : 0;
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

function formatBalanceUsd(usd: number, preferK: boolean): string {
  if (preferK && usd >= 1000) {
    const k = usd / 1000;
    const rounded = Math.round(k * 100) / 100;
    const text =
      rounded >= 10
        ? rounded.toFixed(0)
        : rounded.toFixed(2).replace(/\.?0+$/, "");
    return `$${text}k`;
  }
  return `$${Math.round(usd).toLocaleString("en-US")}`;
}

function parseDeltaPct(delta: string): number {
  const n = parseFloat(delta.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatDeltaPct(pct: number): string {
  const roundedInt = Math.round(pct);
  const nearInt = Math.abs(pct - roundedInt) < 0.06;
  const body = nearInt
    ? String(Math.abs(roundedInt))
    : Math.abs(pct).toFixed(1).replace(/\.0$/, "");
  if (pct < 0) return `-${body}%`;
  return `+${body}%`;
}

function useLiveTradingMetrics(bot: BotUnit) {
  const preferK = bot.balance.toLowerCase().includes("k");

  const [usd, setUsd] = React.useState(() => parseBalanceUsd(bot.balance));
  const [tradeCount, setTradeCount] = React.useState(
    () => parseInt(bot.trades, 10) || 0,
  );
  const [deltaPct, setDeltaPct] = React.useState(() =>
    parseDeltaPct(bot.delta),
  );

  React.useEffect(() => {
    const seed = hashUnitId(bot.id);
    /** Fast cadence (~6–14 ticks/s per card), staggered so units don’t sync. */
    const intervalMs = 70 + (seed % 90);

    const tick = () => {
      const r = Math.random();
      /** Fewer trade ticks than balance/delta so counts stay plausible at high Hz. */
      const tradeBump = r < 0.05 ? 2 : r < 0.27 ? 1 : 0;
      setTradeCount((t) => t + tradeBump);
      setUsd((u) => {
        const scale = Math.max(u * 0.009, 0.12);
        const drift = (Math.random() - 0.43) * scale;
        return Math.max(0, u + drift);
      });
      setDeltaPct((d) => {
        const jitter = (Math.random() - 0.41) * 1.15;
        const next = d + jitter;
        return Math.min(999, Math.max(-99, next));
      });
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [bot.id]);

  const balanceLabel = React.useMemo(
    () => formatBalanceUsd(usd, preferK),
    [usd, preferK],
  );

  const tradesLabel = `${tradeCount} trade${tradeCount === 1 ? "" : "s"}`;
  const deltaLabel = formatDeltaPct(deltaPct);
  const deltaNegative = deltaPct < 0;
  const sparklineStroke = deltaNegative ? NEGATIVE_DELTA_COLOR : bot.trend;

  return {
    balanceLabel,
    tradesLabel,
    deltaLabel,
    deltaNegative,
    sparklineStroke,
  };
}

export function BotUnitCard({
  bot,
  isSelected,
  onSelect,
  className,
  sparklineEntranceIndex,
}: {
  bot: BotUnit;
  isSelected: boolean;
  onSelect: () => void;
  className?: string;
  /** When cards mount in a staggered list (e.g. morph demo), sparkline draws follow the same cadence. */
  sparklineEntranceIndex?: number;
}) {
  const live = useLiveTradingMetrics(bot);

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={clsx(
        "mx-auto flex w-full max-w-[420px] cursor-pointer flex-col overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#4D68FF]/50",
        BOT_UNIT_CARD_SURFACE_CLASSES,
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2.5">
              <p className="truncate text-[14px] font-semibold tracking-wide text-white/90">
                {bot.name}
              </p>
              <p className="truncate text-[10px] text-white/35">
                PID: {bot.pid}
              </p>
            </div>
          </div>
          <p className="shrink-0 text-[10px] font-medium tracking-wide text-white/45 tabular-nums">
            {bot.dateLabel}
          </p>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4 rounded-lg pt-1">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-white/90">
              {live.tradesLabel}
            </p>
            <p
              className={clsx(
                "mt-1 text-[11px] font-semibold tabular-nums transition-colors duration-300",
                live.deltaNegative ? "text-[#F87171]" : "text-[#2FE0A4]",
              )}
            >
              {live.deltaLabel}
            </p>
          </div>
          <BotUnitSparklineIcon
            className="pointer-events-none shrink-0"
            trendStroke={live.sparklineStroke}
            negative={live.deltaNegative}
            entranceIndex={sparklineEntranceIndex}
          />
        </div>
      </div>

      <div className={clsx(BOT_UNIT_CARD_FOOTER_CLASSES, "mt-auto")}>
        <div className="flex min-w-0 items-center gap-1.5">
          <TotalBalanceIcon className="size-3.5 shrink-0 text-white/70" />
          <span className="truncate text-[12px] font-medium tabular-nums text-white/90">
            {live.balanceLabel}
          </span>
        </div>
        <button
          type="button"
          aria-label="Add balance"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] font-medium text-white/90 transition-colors hover:bg-white/8 hover:text-white focus-visible:ring-2 focus-visible:ring-[#4D68FF]/45 focus-visible:outline-none"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <DepositIcon className="size-3.5 text-white/85" />
          Add balance
        </button>
      </div>
    </article>
  );
}

function BotUnitsTableRow({
  bot,
  selected,
  onSelect,
}: {
  bot: BotUnit;
  selected: boolean;
  onSelect: () => void;
}) {
  const live = useLiveTradingMetrics(bot);

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={clsx(
        "cursor-pointer border-b border-white/6 outline-none transition-colors last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4D68FF]/50",
        selected ? "bg-[#191A1A]" : "hover:bg-white/4",
      )}
    >
      <td className="max-w-[200px] truncate px-2.5 py-3 font-semibold text-white/90">
        {bot.name}
      </td>
      <td className="px-2.5 py-3 tabular-nums text-white/55">{bot.pid}</td>
      <td className="px-2.5 py-3 tabular-nums text-white/45">{bot.dateLabel}</td>
      <td className="px-2.5 py-3 text-right font-semibold tabular-nums text-white/90">
        {live.balanceLabel}
      </td>
      <td
        className={clsx(
          "px-2.5 py-3 text-right font-semibold tabular-nums transition-colors duration-300",
          live.deltaNegative ? "text-[#F87171]" : "text-[#2FE0A4]",
        )}
      >
        {live.deltaLabel}
      </td>
    </tr>
  );
}

export function BotUnitsTable({
  bots,
  selectedBotId,
  onSelect,
}: {
  bots: readonly BotUnit[];
  selectedBotId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
      <table className="w-full min-w-[560px] border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-white/10 bg-[#0F1010] text-[10px] font-semibold tracking-wide text-white/45 uppercase">
            <th className="px-2.5 py-3 text-left">Unit</th>
            <th className="px-2.5 py-3 text-left">PID</th>
            <th className="px-2.5 py-3 text-left">Since</th>
            <th className="px-2.5 py-3 text-right tabular-nums">Balance</th>
            <th className="px-2.5 py-3 text-right">Change</th>
          </tr>
        </thead>
        <tbody>
          {bots.map((bot) => (
            <BotUnitsTableRow
              key={bot.id}
              bot={bot}
              selected={selectedBotId === bot.id}
              onSelect={() => onSelect(bot.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
