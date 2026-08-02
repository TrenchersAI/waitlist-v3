"use client";

import * as React from "react";

// =============================================================================
// AccountingChart — daily fees collected vs rakeback accrued against them
// =============================================================================
//
// Grouped (not stacked) bars, deliberately: revenue and rakeback are not parts
// of a whole, they are a claim and a counter-claim on the same fee. Stacking
// them would imply they sum to something meaningful. Side-by-side lets you read
// the GAP, which is the margin, and lets a day where rakeback exceeds revenue
// be immediately obvious rather than hidden inside a stack.
//
// Self-contained SVG — no chart lib — so it stays inside the app's CSP and
// matches the dark analytics theme, same as `trading-bar-chart.tsx`.

export type AccountingDay = {
  date: string; // YYYY-MM-DD (UTC)
  revenue: number; // SOL
  rakeback: number; // SOL
  margin: number; // SOL
};

// ---- palette ---------------------------------------------------------------
// Chart series need explicit values; these are the only literals in the file.
const REVENUE = "#2dd4bf"; // teal-400 — money in, matches "Manual" on the sibling charts
const RAKEBACK = "#fb923c"; // orange-400 — money promised back
const GRID = "rgba(255,255,255,0.06)";
const AXIS = "rgba(255,255,255,0.35)";

const H = 260;
const PAD = { top: 16, right: 12, bottom: 28, left: 44 };

function fmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 1000) return Math.round(n).toLocaleString("en-US");
  if (a >= 1) return n.toFixed(2);
  if (a === 0) return "0";
  return n.toFixed(a < 0.001 ? 5 : 3);
}

/** Axis ticks share ONE decimal count, derived from the largest tick. Mixing
 *  "1.77" with "0.883" down a single axis reads as noise and makes the scale
 *  harder to compare at a glance. */
function axisFmt(n: number, max: number): string {
  if (max >= 1000) return Math.round(n).toLocaleString("en-US");
  const decimals = max >= 10 ? 1 : max >= 1 ? 2 : max >= 0.01 ? 3 : 5;
  return n.toFixed(decimals);
}

export function AccountingChart({ days }: { days: AccountingDay[] }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const [w, setW] = React.useState(720);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  // Track the container width so the SVG scales; ResizeObserver rather than a
  // window listener so it also reacts to the sidebar collapsing.
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next && next > 0) setW(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = Math.max(w - PAD.left - PAD.right, 120);
  const innerH = H - PAD.top - PAD.bottom;

  const max = React.useMemo(
    () => Math.max(...days.map((d) => Math.max(d.revenue, d.rakeback)), 0.000001),
    [days],
  );

  // Four gridlines is enough to read a value without turning the plot into
  // graph paper.
  const ticks = React.useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i <= 4; i++) out.push((max / 4) * i);
    return out;
  }, [max]);

  const slot = innerW / Math.max(days.length, 1);
  const barW = Math.max(Math.min(slot * 0.32, 22), 3);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const active = hover != null ? days[hover] : null;

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        width={w}
        height={H}
        viewBox={`0 0 ${w} ${H}`}
        role="img"
        aria-label={`Daily fees collected versus rakeback accrued, ${days.length} days`}
        className="w-full overflow-visible"
        onMouseLeave={() => setHover(null)}
      >
        {/* gridlines + y axis */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={w - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke={GRID}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(t) + 3}
              textAnchor="end"
              fontSize={10}
              fill={AXIS}
              className="tabular-nums"
            >
              {axisFmt(t, max)}
            </text>
          </g>
        ))}

        {days.map((d, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const isActive = hover === i;
          const revH = Math.max(PAD.top + innerH - y(d.revenue), 0);
          const rakeH = Math.max(PAD.top + innerH - y(d.rakeback), 0);
          // A day where rakeback outruns revenue is the shape worth noticing,
          // so it gets a tinted column behind it rather than being left to the
          // reader to spot.
          const inverted = d.rakeback > d.revenue;

          return (
            <g key={d.date}>
              {(isActive || inverted) && (
                <rect
                  x={cx - slot / 2}
                  y={PAD.top}
                  width={slot}
                  height={innerH}
                  fill={
                    inverted ? "rgba(251,146,60,0.07)" : "rgba(255,255,255,0.035)"
                  }
                />
              )}
              <rect
                x={cx - barW - 1}
                y={y(d.revenue)}
                width={barW}
                height={revH}
                rx={2}
                fill={REVENUE}
                opacity={hover == null || isActive ? 0.95 : 0.4}
              />
              <rect
                x={cx + 1}
                y={y(d.rakeback)}
                width={barW}
                height={rakeH}
                rx={2}
                fill={RAKEBACK}
                opacity={hover == null || isActive ? 0.95 : 0.4}
              />
              {/* full-height hit area — bars alone are too thin to hover */}
              <rect
                x={cx - slot / 2}
                y={PAD.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
              {days.length <= 14 || i % 3 === 0 ? (
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill={AXIS}
                >
                  {d.date.slice(5)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {active ? (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-white/10 bg-black/90 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
          style={{
            left: Math.min(
              Math.max(PAD.left + slot * (hover ?? 0) + slot / 2 - 70, 0),
              Math.max(w - 150, 0),
            ),
          }}
          role="status"
        >
          <div className="mb-1 font-medium text-white">{active.date}</div>
          <Row color={REVENUE} label="Collected" value={active.revenue} />
          <Row color={RAKEBACK} label="Rakeback accrued" value={active.rakeback} />
          <div className="mt-1 border-t border-white/10 pt-1 text-white/70">
            Margin{" "}
            <span
              className={
                active.margin < 0
                  ? "font-medium text-rose-400 tabular-nums"
                  : "font-medium text-emerald-400 tabular-nums"
              }
            >
              {fmt(active.margin)} ◎
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-white/50">
        <Legend color={REVENUE} label="Fees collected" />
        <Legend color={RAKEBACK} label="Rakeback accrued" />
      </div>
    </div>
  );
}

function Row({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-1.5 text-white/80">
      <span
        className="size-2 rounded-sm"
        style={{ background: color }}
        aria-hidden
      />
      {label}{" "}
      <span className="font-medium text-white tabular-nums">{fmt(value)} ◎</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="size-2 rounded-sm"
        style={{ background: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}
