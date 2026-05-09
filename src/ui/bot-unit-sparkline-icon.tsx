import type { SVGProps } from "react";

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
  const points = negative
    ? "2,8 16,10 28,14 40,13 54,19 66,18 80,24"
    : "2,22 16,20 28,18 40,12 54,14 66,8 80,10";

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
        points={points}
        stroke={trendStroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
