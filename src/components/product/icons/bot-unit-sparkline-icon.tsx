import clsx from "clsx";
import { useId, type SVGProps } from "react";

type Props = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Line stroke color (e.g. bot trend hex). */
  trendStroke: string;
  /** Downward-trend polyline when true (fallback shape only). */
  negative?: boolean;
  /**
   * Real equity series (oldest→newest SOL). When provided with ≥2 points the
   * sparkline plots actual movement; otherwise it falls back to a static
   * up/down hint shape. A sparkline intentionally has no axes — the larger
   * dashboard chart owns the labeled time/price axes.
   */
  series?: number[];
  /**
   * Resting style for an agent that is not trading: dim line, no area fill.
   * The trend hue stays — it is data, and the badge beside the chart is what
   * names the lifecycle state.
   */
  paused?: boolean;
  /**
   * "Starting…" window (resume from pause, or a first start whose engine
   * task is not listed yet): dashed stroke that marches along the path, no
   * area fill. A solid line here reads as already trading.
   */
  starting?: boolean;
  /**
   * One-shot animation for a lifecycle CHANGE — never on first paint, or a
   * fleet load would animate every card at once. Styling lives in
   * `.bot-unit-sparkline--*` (`src/styles/index.css`), which also carries the
   * `prefers-reduced-motion` off switch; pass `null` to skip it entirely.
   */
  replay?: "pause" | "resume" | null;
};

const VIEW_W = 82;
const VIEW_H = 28;
const PAD_Y = 4;

function seriesToPoints(series: number[]): string {
  const n = series.length;
  let min = series[0];
  let max = series[0];
  for (const v of series) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  const usableH = VIEW_H - PAD_Y * 2;
  return series
    .map((v, i) => {
      const x = n === 1 ? VIEW_W : (i / (n - 1)) * VIEW_W;
      // Invert Y so higher SOL renders nearer the top.
      const y = PAD_Y + (1 - (v - min) / span) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function BotUnitSparklineIcon({
  trendStroke,
  negative,
  series,
  paused,
  starting,
  replay,
  width = VIEW_W,
  height = VIEW_H,
  className,
  ...props
}: Props) {
  const gradientId = useId();
  const hasSeries = Array.isArray(series) && series.length >= 2;

  const points = hasSeries
    ? seriesToPoints(series)
    : negative
      ? "2,8 16,10 28,14 40,13 54,19 66,18 80,24"
      : "2,22 16,20 28,18 40,12 54,14 66,8 80,10";

  // Area fill anchors: close the polyline down to the baseline.
  const areaPoints = `${points} ${VIEW_W},${VIEW_H} 0,${VIEW_H}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      fill="none"
      aria-hidden
      className={clsx(
        className,
        "bot-unit-sparkline",
        paused && "bot-unit-sparkline--paused",
        starting && "bot-unit-sparkline--starting",
        replay === "pause" && "bot-unit-sparkline--pausing",
        replay === "resume" && "bot-unit-sparkline--resuming",
      )}
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={trendStroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={trendStroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {hasSeries ? (
        <polygon
          className="bot-unit-sparkline__area"
          points={areaPoints}
          fill={`url(#${gradientId})`}
          stroke="none"
        />
      ) : null}
      {/* `pathLength` normalizes the line to 100 units so the resume sweep is
        one `stroke-dashoffset: 100 → 0` regardless of how jagged the real
        series is — measuring it per card would need a layout read. */}
      <polyline
        className="bot-unit-sparkline__line"
        points={points}
        pathLength={100}
        stroke={trendStroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
