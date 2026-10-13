"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { BorderBeam } from "border-beam";
import { useReducedMotion } from "motion/react";

import BotUnitSparklineIcon from "./icons/bot-unit-sparkline-icon";
import DepositIcon from "./icons/deposit-icon";
import TotalBalanceIcon from "./icons/total-balance-icon";
import {
  BOT_UNIT_CARD_CHART_SLOT_CLASS,
  BOT_UNIT_CARD_FACTS_COPY_CLASS,
  BOT_UNIT_CARD_FACTS_ROW_CLASS,
  BOT_UNIT_CARD_FOOTER_CLASSES,
  BOT_UNIT_CARD_SIZE_QUERY_HOST_CLASSES,
  BOT_UNIT_CARD_SURFACE_CLASSES,
} from "./bot-unit-card-styles";

/**
 * Display-only copy of trenchers_fe `BotUnitCard`
 * (`src/components/ai-agent/bot-unit-card.tsx`) as it renders a Paper preview
 * row: same markup and classes, no API, toasts, router or fund dialogs.
 */
export type BotUnit = {
  id: string;
  name: string;
  pid: string;
  balance: string;
  delta: string;
  trend: string;
  dateLabel: string;
  trades: string;
  sparkline?: number[];
};

function deltaToneClass(trend: string): string {
  if (trend === "#F38D8D") return "text-[#F38D8D]";
  if (trend === "#F2B34F") return "text-[#F2B34F]";
  return "text-[#2FE0A4]";
}

export function BotUnitCard({
  bot,
  className,
  sizeQueryHost = false,
  fundBeam = false,
  hideFooterAction = false,
  badge,
}: {
  bot: BotUnit;
  className?: string;
  /** Environment pill shown before the date (`BotUnitPaperBadge` / `BotUnitLiveBadge`). */
  badge?: ReactNode;
  sizeQueryHost?: boolean;
  /** Animated beam on Add balance, the card's unfunded cue in the app. */
  fundBeam?: boolean;
  hideFooterAction?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <article
      className={clsx(
        "flex min-h-0 flex-col overflow-hidden rounded-xl",
        BOT_UNIT_CARD_SURFACE_CLASSES,
        sizeQueryHost && BOT_UNIT_CARD_SIZE_QUERY_HOST_CLASSES,
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col p-5">
        <div className="flex min-h-5 shrink-0 items-center justify-between gap-3">
          <p
            className="min-w-0 truncate text-[14px] font-semibold leading-none tracking-wide text-white/90"
            title={bot.name}
          >
            {bot.name}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {badge}
            <p className="text-[12px] font-medium leading-none tracking-wide text-white/45 tabular-nums">
              {bot.dateLabel}
            </p>
          </div>
        </div>

        <div className={BOT_UNIT_CARD_FACTS_ROW_CLASS}>
          <div className={BOT_UNIT_CARD_FACTS_COPY_CLASS}>
            <p className="truncate text-[12px] font-normal text-white/90">
              {bot.trades}
            </p>
            <p
              className={clsx(
                "mt-1 truncate text-[12px] font-normal tabular-nums",
                deltaToneClass(bot.trend),
              )}
            >
              {bot.delta}
            </p>
          </div>
          <div className={BOT_UNIT_CARD_CHART_SLOT_CLASS}>
            <BotUnitSparklineIcon
              className="pointer-events-none h-full w-full"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              trendStroke={bot.trend}
              negative={bot.trend === "#F38D8D"}
              series={bot.sparkline}
            />
          </div>
        </div>
      </div>

      <div className={clsx(BOT_UNIT_CARD_FOOTER_CLASSES, "relative mt-auto")}>
        <div className="flex min-w-0 items-center gap-1.5">
          <TotalBalanceIcon className="size-3.5 shrink-0 text-white/70" />
          <span className="truncate text-[12px] font-medium tabular-nums text-white/90">
            {bot.balance}
          </span>
        </div>
        {hideFooterAction ? null : (
          <BorderBeam
            size="sm"
            colorVariant="ocean"
            borderRadius={8}
            active={fundBeam && !reduceMotion}
            className="inline-flex shrink-0"
          >
            <span
              data-cursor-target="add-balance"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] font-medium text-white/90"
            >
              <DepositIcon className="size-3.5 text-white/85" />
              Add balance
            </span>
          </BorderBeam>
        )}
      </div>
    </article>
  );
}
