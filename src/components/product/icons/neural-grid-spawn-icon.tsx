import clsx from "clsx";
import { useId, type ReactNode, type SVGProps } from "react";

/** 8×8 pixel grid — lit cells match “neural / AI” clusters (bottom-left block, top-right, mid-right). */
const ROWS = 8;
const COLS = 8;
const VIEW = 32;
const CELL = 2.85;
const GAP = 0.45;
/** Padding so the 8×8 lattice is a perfect square centered in the viewBox. */
const GRID_SPAN = COLS * CELL + (COLS - 1) * GAP;
const PAD = (VIEW - GRID_SPAN) / 2;
/** Radius so dots read as circles with slight separation (was square cells). */
const DOT_R = CELL / 2 - 0.12;
const ACTIVE_BLUE = "#4D68FF";

const ACTIVE = new Set([
  "6,0",
  "6,1",
  "7,0",
  "7,1",
  "0,6",
  "0,7",
  "1,7",
  "3,7",
  "4,7",
]);

export default function NeuralGridSpawnIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  const safeId = useId().replace(/:/g, "");
  const filterId = `neural-glow-${safeId}`;

  const dots: ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${r},${c}`;
      const x = PAD + c * (CELL + GAP) + CELL / 2;
      const y = PAD + r * (CELL + GAP) + CELL / 2;
      const active = ACTIVE.has(key);
      dots.push(
        <circle
          key={key}
          cx={x}
          cy={y}
          r={DOT_R}
          fill={active ? ACTIVE_BLUE : "#242424"}
          className={active ? undefined : "opacity-[0.85]"}
          filter={active ? `url(#${filterId})` : undefined}
        />,
      );
    }
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      className={clsx("block aspect-square shrink-0", className)}
      aria-hidden
      {...props}
    >
      <defs>
        <filter
          id={filterId}
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="0.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {dots}
    </svg>
  );
}
