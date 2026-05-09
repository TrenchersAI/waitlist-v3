"use client";

import clsx from "clsx";
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

export function BotUnitCard({
  bot,
  isSelected,
  onSelect,
  className,
}: {
  bot: BotUnit;
  isSelected: boolean;
  onSelect: () => void;
  className?: string;
}) {
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
        "flex cursor-pointer flex-col overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#4D68FF]/50",
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
            <p className="text-[11px] font-semibold text-white/90">0 trades</p>
            <p className="mt-1 text-[11px] font-semibold text-[#2FE0A4]">+0%</p>
          </div>
          <BotUnitSparklineIcon
            className="pointer-events-none shrink-0"
            trendStroke={bot.trend}
            negative={false}
          />
        </div>
      </div>

      <div className={clsx(BOT_UNIT_CARD_FOOTER_CLASSES, "mt-auto")}>
        <div className="flex min-w-0 items-center gap-1.5">
          <TotalBalanceIcon className="size-3.5 shrink-0 text-white/70" />
          <span className="truncate text-[12px] font-medium tabular-nums text-white/90">
            {bot.balance}
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
          {bots.map((bot) => {
            const selected = selectedBotId === bot.id;
            return (
              <tr
                key={bot.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(bot.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(bot.id);
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
                <td className="px-2.5 py-3 tabular-nums text-white/55">
                  {bot.pid}
                </td>
                <td className="px-2.5 py-3 tabular-nums text-white/45">
                  {bot.dateLabel}
                </td>
                <td className="px-2.5 py-3 text-right font-semibold tabular-nums text-white/90">
                  {bot.balance}
                </td>
                <td className="px-2.5 py-3 text-right font-semibold tabular-nums text-[#2FE0A4]">
                  +0%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
