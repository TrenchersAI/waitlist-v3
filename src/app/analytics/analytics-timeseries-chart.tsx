"use client";

import * as React from "react";

type Point = { date: string; count: number };

type BucketType = "day" | "hour";

type Props = {
  /** Primary series — drawn as the tall bar per bucket. */
  signupsByDay: Point[];
  /** Secondary series — by default only shown in the tooltip. When
     `showSecondaryBar` is true, also drawn as a brighter solid bar overlapping
     the primary's bottom portion (subset visualization). */
  verificationsByDay: Point[];
  /** When "hour", `date` strings are expected as `YYYY-MM-DDTHH` and tick
     labels render as hour-of-day. Default "day". */
  bucketType?: BucketType;
  /** Show the secondary series as a stacked overlay bar. */
  showSecondaryBar?: boolean;
  /** Tooltip labels for the two series ("new" / "verified" by default). */
  primaryLabel?: string;
  secondaryLabel?: string;
  /** Legend label below the chart for the primary bar (defaults to
     "New signups"). */
  primaryLegend?: string;
  /** Legend label for the secondary bar / dot. */
  secondaryLegend?: string;
  className?: string;
};

const W = 720;
const H = 280;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 28;
const PAD_B = 36;

const BAR_ACTIVE = "rgb(255 255 255)";
const BAR_IDLE = "rgba(255,255,255,0.78)";
// Dimmer idle for the primary bar when an overlay secondary bar is shown, so
// the bright secondary reads as the headline metric.
const BAR_IDLE_STACKED = "rgba(255,255,255,0.22)";
const BAR_ACTIVE_STACKED = "rgba(255,255,255,0.42)";
const SECONDARY_FILL = "rgb(255 255 255)";
const VERIFY_DOT = "rgb(129 140 248)"; // indigo-400 — used only in the tooltip swatch

function dayTickLabel(iso: string, totalBuckets: number): string {
  // Sub-week windows look cleaner with one-letter day initials; for longer
  // windows fall back to MM-DD so consecutive days don't collide.
  if (totalBuckets <= 7) {
    const d = new Date(`${iso}T00:00:00.000Z`);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "UTC",
    });
  }
  return iso.slice(5);
}

function hourTickLabel(isoHour: string): string {
  // Input: "YYYY-MM-DDTHH". Output: "12a" / "3a" / "12p" / "9p" — short and
  // unambiguous on a 24-bar axis.
  const hour = Number.parseInt(isoHour.slice(11, 13), 10);
  if (!Number.isFinite(hour)) return "";
  const suffix = hour < 12 ? "a" : "p";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}${suffix}`;
}

function tooltipDateLabel(iso: string, bucketType: BucketType): string {
  if (bucketType === "hour") {
    const d = new Date(`${iso}:00:00.000Z`);
    const day = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const hh = iso.slice(11, 13);
    return `${day} · ${hh}:00 UTC`;
  }
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function AnalyticsTimeseriesChart({
  signupsByDay,
  verificationsByDay,
  bucketType = "day",
  showSecondaryBar = false,
  primaryLabel = "new",
  secondaryLabel = "verified",
  primaryLegend = "New signups",
  secondaryLegend,
  className,
}: Props) {
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const maxY = Math.max(
    1,
    ...signupsByDay.map((d) => d.count),
    ...verificationsByDay.map((d) => d.count),
  );

  const n = signupsByDay.length;

  const verifyMap = React.useMemo(
    () => new Map(verificationsByDay.map((d) => [d.date, d.count])),
    [verificationsByDay],
  );

  if (n === 0) {
    return (
      <div
        className={
          "flex h-[200px] items-center justify-center text-sm text-white/40 " +
          (className ?? "")
        }
      >
        No activity in this range yet.
      </div>
    );
  }

  const colWidth = innerW / n;
  const barWidth = Math.min(32, Math.max(3, colWidth * 0.62));
  // Only render value labels above each bar when there's room for them — for
  // longer windows the labels would collide with each other.
  const showValueLabels = colWidth >= 38;

  const xCenter = (i: number) => PAD_L + colWidth * (i + 0.5);
  const yForCount = (c: number) => PAD_T + innerH - (c / maxY) * innerH;

  // Hourly view (24 buckets) wants a 3-hour tick step; daily view uses the
  // existing density-based step.
  const tickStep =
    bucketType === "hour" ? 3 : n <= 10 ? 1 : Math.ceil(n / 7);

  const setIdxFromClientX = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xRatio = (clientX - rect.left) / rect.width;
    const insideX = xRatio * W - PAD_L;
    if (insideX < 0 || insideX > innerW) {
      setActiveIdx(null);
      return;
    }
    const idx = Math.min(n - 1, Math.max(0, Math.floor(insideX / colWidth)));
    setActiveIdx(idx);
  };

  const active = activeIdx != null ? signupsByDay[activeIdx] : null;
  const activeVerify = active ? (verifyMap.get(active.date) ?? 0) : 0;

  return (
    <div className={"relative " + (className ?? "")}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full max-w-full select-none"
        role="img"
        aria-label="Daily signups and verifications"
        onMouseMove={(e) => setIdxFromClientX(e.clientX)}
        onMouseLeave={() => setActiveIdx(null)}
        onTouchStart={(e) =>
          e.touches[0] && setIdxFromClientX(e.touches[0].clientX)
        }
        onTouchMove={(e) =>
          e.touches[0] && setIdxFromClientX(e.touches[0].clientX)
        }
        onTouchEnd={() => setActiveIdx(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD_T + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={PAD_L}
              x2={PAD_L + innerW}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          );
        })}

        {[0, 0.5, 1].map((t) => {
          const val = Math.round(maxY * t);
          const y = PAD_T + innerH * (1 - t);
          return (
            <text
              key={t}
              x={PAD_L - 8}
              y={y + 4}
              textAnchor="end"
              fill="rgba(255,255,255,0.35)"
              style={{ fontSize: 10 }}
            >
              {val}
            </text>
          );
        })}

        {signupsByDay.map((d, i) => {
          const isActive = activeIdx === i;
          const bx = xCenter(i) - barWidth / 2;
          const by = yForCount(d.count);
          const bh = Math.max(d.count > 0 ? 2 : 0, PAD_T + innerH - by);
          // Stacked overlay: the secondary bar grows from the bottom of the
          // primary bar to its own count height. Always ≤ primary so it sits
          // visually "inside" the primary bar.
          const secondaryCount = verifyMap.get(d.date) ?? 0;
          const secondaryHeight =
            showSecondaryBar && secondaryCount > 0
              ? Math.max(2, (secondaryCount / maxY) * innerH)
              : 0;
          const secondaryY = PAD_T + innerH - secondaryHeight;
          const primaryFill = showSecondaryBar
            ? isActive
              ? BAR_ACTIVE_STACKED
              : BAR_IDLE_STACKED
            : isActive
              ? BAR_ACTIVE
              : BAR_IDLE;
          return (
            <g key={d.date}>
              <rect
                x={PAD_L + colWidth * i}
                y={PAD_T}
                width={colWidth}
                height={innerH}
                fill="transparent"
              />
              {bh > 0 ? (
                <rect
                  x={bx}
                  y={by}
                  width={barWidth}
                  height={bh}
                  rx={Math.min(3, barWidth / 3)}
                  fill={primaryFill}
                  style={{ transition: "fill 120ms ease" }}
                />
              ) : null}
              {secondaryHeight > 0 ? (
                <rect
                  x={bx}
                  y={secondaryY}
                  width={barWidth}
                  height={secondaryHeight}
                  rx={Math.min(3, barWidth / 3)}
                  fill={SECONDARY_FILL}
                  fillOpacity={isActive ? 1 : 0.92}
                  style={{ transition: "fill-opacity 120ms ease" }}
                />
              ) : null}
              {showValueLabels && d.count > 0 ? (
                <text
                  x={xCenter(i)}
                  y={by - 6}
                  textAnchor="middle"
                  fill={
                    isActive
                      ? "rgba(255,255,255,0.95)"
                      : "rgba(255,255,255,0.55)"
                  }
                  style={{
                    fontSize: 10,
                    fontVariantNumeric: "tabular-nums",
                    transition: "fill 120ms ease",
                  }}
                >
                  {showSecondaryBar
                    ? `${secondaryCount}/${d.count}`
                    : d.count}
                </text>
              ) : null}
            </g>
          );
        })}

        {signupsByDay.map((row, i) => {
          if (i % tickStep !== 0 && i !== n - 1) return null;
          const isActive = activeIdx === i;
          return (
            <text
              key={row.date}
              x={xCenter(i)}
              y={H - 10}
              textAnchor="middle"
              fill={
                isActive
                  ? "rgba(255,255,255,0.85)"
                  : "rgba(255,255,255,0.35)"
              }
              style={{ fontSize: 9, transition: "fill 120ms" }}
            >
              {bucketType === "hour"
                ? hourTickLabel(row.date)
                : dayTickLabel(row.date, n)}
            </text>
          );
        })}
      </svg>

      {active && activeIdx != null ? (
        <ChartTooltip
          xPct={(xCenter(activeIdx) / W) * 100}
          yPct={(yForCount(active.count) / H) * 100}
          date={active.date}
          bucketType={bucketType}
          primaryValue={active.count}
          secondaryValue={activeVerify}
          primaryLabel={primaryLabel}
          secondaryLabel={secondaryLabel}
          showSecondaryBar={showSecondaryBar}
        />
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/45">
        {showSecondaryBar ? (
          <>
            <span className="inline-flex items-center gap-2">
              <span
                className="block size-2.5 rounded-sm bg-white"
                aria-hidden
              />
              {secondaryLegend ?? secondaryLabel}
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="block size-2.5 rounded-sm"
                style={{ background: BAR_IDLE_STACKED }}
                aria-hidden
              />
              {primaryLegend}
            </span>
          </>
        ) : (
          <span className="inline-flex items-center gap-2">
            <span
              className="block size-2.5 rounded-sm bg-white"
              aria-hidden
            />
            {primaryLegend} · per UTC {bucketType === "hour" ? "hour" : "day"}
          </span>
        )}
        <span className="ml-auto hidden text-[10px] tracking-[0.12em] text-white/35 uppercase sm:inline">
          Hover a bar for the {bucketType === "hour" ? "hour" : "day"} breakdown
        </span>
      </div>
    </div>
  );
}

function ChartTooltip({
  xPct,
  yPct,
  date,
  bucketType,
  primaryValue,
  secondaryValue,
  primaryLabel,
  secondaryLabel,
  showSecondaryBar,
}: {
  xPct: number;
  yPct: number;
  date: string;
  bucketType: BucketType;
  primaryValue: number;
  secondaryValue: number;
  primaryLabel: string;
  secondaryLabel: string;
  showSecondaryBar: boolean;
}) {
  const niceDate = tooltipDateLabel(date, bucketType);
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/12 bg-black/90 px-3 py-2 text-xs text-white shadow-xl shadow-black/60 backdrop-blur"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: `translate(-50%, calc(-100% - 10px))`,
      }}
    >
      <p className="text-[10px] font-medium tracking-[0.12em] text-white/45 uppercase">
        {niceDate}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <span
          className={
            "size-1.5 rounded-full " + (showSecondaryBar ? "" : "bg-white")
          }
          style={
            showSecondaryBar ? { background: BAR_IDLE_STACKED } : undefined
          }
          aria-hidden
        />
        <span className="tabular-nums">{primaryValue}</span>
        <span className="text-white/45">{primaryLabel}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-2">
        <span
          className="size-1.5 rounded-full"
          style={{ background: showSecondaryBar ? SECONDARY_FILL : VERIFY_DOT }}
          aria-hidden
        />
        <span className="tabular-nums">{secondaryValue}</span>
        <span className="text-white/45">{secondaryLabel}</span>
      </div>
    </div>
  );
}
