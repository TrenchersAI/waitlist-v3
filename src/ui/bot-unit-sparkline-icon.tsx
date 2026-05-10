"use client";

import type { SVGProps } from "react";
import { useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

type Props = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Line stroke color (e.g. bot trend hex). */
  trendStroke: string;
  /** Downward-trend polyline when true. */
  negative?: boolean;
};

export default function BotUnitSparklineIcon({
  trendStroke,
  negative,
  width = 82,
  height = 28,
  ...props
}: Props) {
  const reduceMotion = useReducedMotion();
  const polyRef = useRef<SVGPolylineElement>(null);

  const points = negative
    ? "2,8 16,10 28,14 40,13 54,19 66,18 80,24"
    : "2,22 16,20 28,18 40,12 54,14 66,8 80,10";

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
        delay: 60,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );

    return () => anim.cancel();
  }, [negative, points, reduceMotion]);

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
