"use client";

import type { SVGProps } from "react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "motion/react";

import {
  BOT_UNIT_CARD_SPARKLINE_BASE_DELAY_MS,
  BOT_UNIT_CARD_SPARKLINE_STAGGER_MS,
} from "@/src/components/bot-unit-card-styles";

type Props = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Line stroke color (e.g. bot trend hex). */
  trendStroke: string;
  /** Downward-trend polyline when true. */
  negative?: boolean;
  /**
   * When set (e.g. 0, 1, 2 for stacked demo cards), stroke draw delays by
   * {@link BOT_UNIT_CARD_SPARKLINE_STAGGER_MS} per step so paths animate in sequence.
   */
  entranceIndex?: number;
};

export default function BotUnitSparklineIcon({
  trendStroke,
  negative,
  entranceIndex,
  width = 82,
  height = 28,
  ...props
}: Props) {
  const reduceMotion = useReducedMotion();
  const polyRef = useRef<SVGPolylineElement>(null);

  const points = negative
    ? "2,8 16,10 28,14 40,13 54,19 66,18 80,24"
    : "2,22 16,20 28,18 40,12 54,14 66,8 80,10";

  const strokeDelayMs = useMemo(() => {
    const stagger =
      typeof entranceIndex === "number" && entranceIndex >= 0
        ? entranceIndex * BOT_UNIT_CARD_SPARKLINE_STAGGER_MS
        : 0;
    return BOT_UNIT_CARD_SPARKLINE_BASE_DELAY_MS + stagger;
  }, [entranceIndex]);

  useLayoutEffect(() => {
    const el = polyRef.current;
    if (!el) return;

    const length = el.getTotalLength();
    el.style.strokeDasharray = String(length);

    if (reduceMotion) {
      el.style.strokeDashoffset = "0";
      return;
    }

    el.style.strokeDashoffset = String(length);
    const anim = el.animate(
      [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
      {
        duration: 920,
        delay: strokeDelayMs,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );

    return () => anim.cancel();
  }, [negative, points, reduceMotion, strokeDelayMs]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 82 28"
      fill="none"
      aria-hidden
      {...props}
    >
      <polyline
        ref={polyRef}
        points={points}
        stroke={trendStroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
