"use client";

import * as React from "react";

type Point = { date: string; count: number };

type Props = {
  signupsByDay: Point[];
  verificationsByDay: Point[];
  className?: string;
};

const W = 720;
const H = 260;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 20;
const PAD_B = 36;

function buildPoints(series: Point[], maxY: number, innerW: number, innerH: number) {
  const n = series.length;
  if (n === 0) return "";
  if (n === 1) {
    const y = PAD_T + innerH - (series[0].count / maxY) * innerH;
    return `${PAD_L},${y} ${PAD_L + innerW},${y}`;
  }
  return series
    .map((row, i) => {
      const x = PAD_L + (i / (n - 1)) * innerW;
      const y = PAD_T + innerH - (row.count / maxY) * innerH;
      return `${x},${y}`;
    })
    .join(" ");
}

export function AnalyticsTimeseriesChart({
  signupsByDay,
  verificationsByDay,
  className,
}: Props) {
  const uid = React.useId().replace(/:/g, "");
  const fillA = `analytics-fill-a-${uid}`;
  const fillB = `analytics-fill-b-${uid}`;

  const maxY = Math.max(
    1,
    ...signupsByDay.map((d) => d.count),
    ...verificationsByDay.map((d) => d.count),
  );

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const ptsA = buildPoints(signupsByDay, maxY, innerW, innerH);
  const ptsB = buildPoints(verificationsByDay, maxY, innerW, innerH);

  const n = signupsByDay.length;
  const tickStep = n <= 8 ? 1 : Math.ceil(n / 7);

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full max-w-full"
        role="img"
        aria-label="Daily signups and verifications"
      >
        <defs>
          <linearGradient id={fillA} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={fillB} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(56 189 248)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(56 189 248)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD_T + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={PAD_L}
              x2={PAD_L + innerW}
              y1={y}
              y2={y}
              stroke="rgb(39 39 42)"
              strokeWidth="1"
            />
          );
        })}

        {/* Y labels */}
        {[0, 0.5, 1].map((t) => {
          const val = Math.round(maxY * t);
          const y = PAD_T + innerH * (1 - t);
          return (
            <text
              key={t}
              x={PAD_L - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-zinc-500"
              style={{ fontSize: 10 }}
            >
              {val}
            </text>
          );
        })}

        {/* Area under signups */}
        {n > 0 && ptsA ? (
          <polygon
            fill={`url(#${fillA})`}
            points={`${PAD_L},${PAD_T + innerH} ${ptsA} ${PAD_L + innerW},${PAD_T + innerH}`}
          />
        ) : null}

        {/* Area under verifications */}
        {n > 0 && ptsB ? (
          <polygon
            fill={`url(#${fillB})`}
            points={`${PAD_L},${PAD_T + innerH} ${ptsB} ${PAD_L + innerW},${PAD_T + innerH}`}
          />
        ) : null}

        {n > 0 && ptsA ? (
        <polyline
          fill="none"
          stroke="rgb(52 211 153)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={ptsA}
        />
        ) : null}
        {n > 0 && ptsB ? (
        <polyline
          fill="none"
          stroke="rgb(56 189 248)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={ptsB}
        />
        ) : null}

        {/* X tick labels */}
        {signupsByDay.map((row, i) => {
          if (i % tickStep !== 0 && i !== n - 1) return null;
          const x = n <= 1 ? PAD_L + innerW / 2 : PAD_L + (i / (n - 1)) * innerW;
          return (
            <text
              key={row.date}
              x={x}
              y={H - 10}
              textAnchor="middle"
              className="fill-zinc-500"
              style={{ fontSize: 9 }}
            >
              {row.date.slice(5)}
            </text>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400" aria-hidden />
          New signups (created)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-sky-400" aria-hidden />
          Verified (OTP completed)
        </span>
      </div>
    </div>
  );
}
