"use client";

import * as React from "react";

// =============================================================================
// TradingBarChart — purpose-built stacked chart for the trading dashboards
// =============================================================================
//
// Unlike the shared `AnalyticsTimeseriesChart` (integer counts, subset overlay),
// this one is built for SOL money series where each day is a genuine SUM of two
// parts: total = bot + manual. It renders a TRUE stack (bot segment on the
// bottom, manual stacked on top, together reaching the day's total) with:
//   • distinct gradient fills for bot vs manual
//   • a Daily (stacked bars) and a Cumulative (stacked area) view
//   • a rich hover tooltip (total + bot%/manual% split)
//   • an animated mount, active-column highlight, and SOL-aware axes
//
// It is self-contained SVG — no chart lib — so it stays inside the app's CSP
// and matches the dark analytics theme.

export type TradingDay = {
  date: string; // YYYY-MM-DD (UTC)
  total: number;
  bot: number;
  manual: number;
};

export type ChartView = "daily" | "cumulative";

type Props = {
  days: TradingDay[];
  view: ChartView;
  /** Unit suffix shown in the tooltip / axis (e.g. "SOL"). */
  unit?: string;
  botLegend?: string;
  manualLegend?: string;
};

// ---- palette ---------------------------------------------------------------
const BOT = "#818cf8"; // indigo-400
const BOT_DEEP = "#4f46e5"; // indigo-600
const MANUAL = "#2dd4bf"; // teal-400
const MANUAL_DEEP = "#0d9488"; // teal-600

// ---- geometry --------------------------------------------------------------
const W = 760;
const H = 300;
const PAD_L = 52;
const PAD_R = 18;
const PAD_T = 24;
const PAD_B = 40;

// ---- number formatting -----------------------------------------------------
/** Compact SOL for axis ticks: 12.3k / 1.2k / 340 / 4.2 / 0.03. */
function fmtCompact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  if (a >= 100) return Math.round(n).toString();
  if (a >= 1) return n.toFixed(1);
  if (a === 0) return "0";
  return n.toFixed(a < 0.01 ? 4 : 3);
}

/** Fuller SOL for tooltips. */
function fmtSol(n: number): string {
  const a = Math.abs(n);
  if (a >= 1000) return Math.round(n).toLocaleString("en-US");
  if (a >= 1) return n.toFixed(2);
  if (a === 0) return "0";
  return n.toFixed(a < 0.001 ? 5 : 3);
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function dayTick(iso: string, n: number): string {
  if (n <= 8) {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "UTC",
    });
  }
  return iso.slice(5); // MM-DD
}

function tooltipDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** SVG path for a rect with only its TOP corners rounded. */
function topRoundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${
    x + w - rr
  },${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

export function TradingBarChart({
  days,
  view,
  unit = "SOL",
  botLegend = "Bot",
  manualLegend = "Manual",
}: Props) {
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const baseline = PAD_T + innerH;
  const n = days.length;

  // Cumulative running sums (used by the cumulative view + its tooltip).
  // Written as prefix sums (no reassignment) — n is at most a few hundred days.
  const cumulative = React.useMemo(
    () =>
      days.map((d, i) => {
        const window = days.slice(0, i + 1);
        const bot = window.reduce((s, x) => s + x.bot, 0);
        const manual = window.reduce((s, x) => s + x.manual, 0);
        return { date: d.date, bot, manual, total: bot + manual };
      }),
    [days],
  );

  const series = view === "cumulative" ? cumulative : days;

  const maxY = React.useMemo(
    () => Math.max(1, ...series.map((d) => d.total)),
    [series],
  );

  if (n === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-white/40">
        No trading in this range yet.
      </div>
    );
  }

  const colWidth = innerW / n;
  const barWidth = Math.min(30, Math.max(4, colWidth * 0.6));
  const showValueCap = colWidth >= 40; // room for a value label atop each bar
  const gap = barWidth > 8 ? 1.5 : 0; // hairline gap between the two segments

  const xCenter = (i: number) => PAD_L + colWidth * (i + 0.5);
  const yFor = (v: number) => PAD_T + innerH - (v / maxY) * innerH;
  const tickStep = n <= 10 ? 1 : Math.ceil(n / 8);

  const setIdxFromClientX = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const insideX = ((clientX - rect.left) / rect.width) * W - PAD_L;
    if (insideX < 0 || insideX > innerW) {
      setActiveIdx(null);
      return;
    }
    setActiveIdx(Math.min(n - 1, Math.max(0, Math.floor(insideX / colWidth))));
  };

  const activeRow = activeIdx != null ? series[activeIdx] : null;

  // Cumulative area geometry.
  const botLine = series.map((d, i) => `${xCenter(i)},${yFor(d.bot)}`);
  const totalLine = series.map((d, i) => `${xCenter(i)},${yFor(d.total)}`);
  const x0 = xCenter(0);
  const xN = xCenter(n - 1);
  const botArea = `M${x0},${baseline} L${botLine.join(" L")} L${xN},${baseline} Z`;
  const manualArea = `M${botLine.join(" L")} L${[...totalLine]
    .reverse()
    .join(" L")} Z`;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full max-w-full select-none"
        role="img"
        aria-label="Trading total per day, split by bot and manual"
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
        <defs>
          <linearGradient id="tc-bot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BOT} />
            <stop offset="100%" stopColor={BOT_DEEP} />
          </linearGradient>
          <linearGradient id="tc-manual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MANUAL} />
            <stop offset="100%" stopColor={MANUAL_DEEP} />
          </linearGradient>
          <linearGradient id="tc-bot-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BOT} stopOpacity="0.45" />
            <stop offset="100%" stopColor={BOT} stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="tc-manual-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MANUAL} stopOpacity="0.4" />
            <stop offset="100%" stopColor={MANUAL} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines + Y axis (SOL) */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD_T + innerH * (1 - t);
          return (
            <line
              key={`g${t}`}
              x1={PAD_L}
              x2={PAD_L + innerW}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.055)"
              strokeWidth="1"
            />
          );
        })}
        {[0, 0.5, 1].map((t) => {
          const y = PAD_T + innerH * (1 - t);
          return (
            <text
              key={`y${t}`}
              x={PAD_L - 10}
              y={y + 3.5}
              textAnchor="end"
              fill="rgba(255,255,255,0.38)"
              style={{ fontSize: 10, fontVariantNumeric: "tabular-nums" }}
            >
              {fmtCompact(maxY * t)}
            </text>
          );
        })}
        <text
          x={PAD_L - 10}
          y={PAD_T - 10}
          textAnchor="end"
          fill="rgba(255,255,255,0.3)"
          style={{ fontSize: 9, letterSpacing: 0.4 }}
        >
          ◎
        </text>

        {/* active column highlight */}
        {activeIdx != null ? (
          <rect
            x={PAD_L + colWidth * activeIdx}
            y={PAD_T}
            width={colWidth}
            height={innerH}
            fill="rgba(255,255,255,0.04)"
            rx={4}
          />
        ) : null}

        {/* grow-in wrapper: scales the drawing up from the baseline on mount */}
        <g
          style={{
            transformBox: "view-box",
            transformOrigin: `0px ${baseline}px`,
            transform: mounted ? "scaleY(1)" : "scaleY(0)",
            transition: "transform 680ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {view === "cumulative" ? (
            <>
              <path d={botArea} fill="url(#tc-bot-area)" />
              <path d={manualArea} fill="url(#tc-manual-area)" />
              <polyline
                points={botLine.join(" ")}
                fill="none"
                stroke={BOT}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <polyline
                points={totalLine.join(" ")}
                fill="none"
                stroke={MANUAL}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          ) : (
            days.map((d, i) => {
              const isActive = activeIdx === i;
              const dim = activeIdx != null && !isActive ? 0.55 : 1;
              const bx = xCenter(i) - barWidth / 2;
              const botH = (d.bot / maxY) * innerH;
              const manualH = (d.manual / maxY) * innerH;
              const hasManual = manualH > 0.4;
              const hasBot = botH > 0.4;
              const manualY = baseline - botH - gap - manualH;
              const botY = baseline - botH;
              const r = Math.min(4, barWidth / 3);
              return (
                <g key={d.date} style={{ opacity: dim, transition: "opacity 120ms" }}>
                  {hasBot ? (
                    <path
                      d={topRoundedRect(
                        bx,
                        botY,
                        barWidth,
                        botH,
                        hasManual ? 0 : r,
                      )}
                      fill="url(#tc-bot)"
                    />
                  ) : null}
                  {hasManual ? (
                    <path
                      d={topRoundedRect(bx, manualY, barWidth, manualH, r)}
                      fill="url(#tc-manual)"
                    />
                  ) : null}
                </g>
              );
            })
          )}
        </g>

        {/* value cap above each daily bar when there's room */}
        {view === "daily" && showValueCap
          ? days.map((d, i) =>
              d.total > 0 ? (
                <text
                  key={`v${d.date}`}
                  x={xCenter(i)}
                  y={yFor(d.total) - 7}
                  textAnchor="middle"
                  fill={
                    activeIdx === i
                      ? "rgba(255,255,255,0.95)"
                      : "rgba(255,255,255,0.5)"
                  }
                  style={{
                    fontSize: 9.5,
                    fontVariantNumeric: "tabular-nums",
                    transition: "fill 120ms",
                  }}
                >
                  {fmtCompact(d.total)}
                </text>
              ) : null,
            )
          : null}

        {/* cumulative hover markers */}
        {view === "cumulative" && activeIdx != null && activeRow ? (
          <>
            <line
              x1={xCenter(activeIdx)}
              x2={xCenter(activeIdx)}
              y1={PAD_T}
              y2={baseline}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={xCenter(activeIdx)} cy={yFor(activeRow.bot)} r={3.5} fill={BOT} />
            <circle
              cx={xCenter(activeIdx)}
              cy={yFor(activeRow.total)}
              r={3.5}
              fill={MANUAL}
            />
          </>
        ) : null}

        {/* X axis date ticks */}
        {series.map((row, i) => {
          if (i % tickStep !== 0 && i !== n - 1) return null;
          return (
            <text
              key={`x${row.date}`}
              x={xCenter(i)}
              y={H - 12}
              textAnchor="middle"
              fill={
                activeIdx === i
                  ? "rgba(255,255,255,0.85)"
                  : "rgba(255,255,255,0.34)"
              }
              style={{ fontSize: 9, transition: "fill 120ms" }}
            >
              {dayTick(row.date, n)}
            </text>
          );
        })}
      </svg>

      {activeRow && activeIdx != null ? (
        <ChartTooltip
          xPct={(xCenter(activeIdx) / W) * 100}
          yPct={(yFor(activeRow.total) / H) * 100}
          row={activeRow}
          unit={unit}
          cumulative={view === "cumulative"}
          botLegend={botLegend}
          manualLegend={manualLegend}
        />
      ) : null}

      {/* legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/50">
        <span className="inline-flex items-center gap-2">
          <span
            className="block h-2.5 w-3 rounded-sm"
            style={{ background: BOT }}
            aria-hidden
          />
          {botLegend}
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="block h-2.5 w-3 rounded-sm"
            style={{ background: MANUAL }}
            aria-hidden
          />
          {manualLegend}
        </span>
        <span className="ml-auto hidden text-[10px] tracking-[0.12em] text-white/35 uppercase sm:inline">
          {view === "cumulative"
            ? "Running total · hover a day"
            : "Per UTC day · hover a bar"}
        </span>
      </div>
    </div>
  );
}

function ChartTooltip({
  xPct,
  yPct,
  row,
  unit,
  cumulative,
  botLegend,
  manualLegend,
}: {
  xPct: number;
  yPct: number;
  row: TradingDay;
  unit: string;
  cumulative: boolean;
  botLegend: string;
  manualLegend: string;
}) {
  // Clamp horizontally so edge tooltips don't overflow the card.
  const left = Math.min(88, Math.max(12, xPct));
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[168px] -translate-x-1/2 rounded-lg border border-white/12 bg-black/90 px-3 py-2.5 text-xs text-white shadow-xl shadow-black/60 backdrop-blur"
      style={{
        left: `${left}%`,
        top: `${yPct}%`,
        transform: "translate(-50%, calc(-100% - 12px))",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-[10px] font-medium tracking-[0.12em] text-white/45 uppercase">
          {tooltipDate(row.date)}
        </p>
        {cumulative ? (
          <span className="text-[9px] tracking-[0.1em] text-white/35 uppercase">
            cumulative
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-base font-semibold tabular-nums">
          {fmtSol(row.total)}
        </span>
        <span className="text-[10px] text-white/40">◎ {unit} total</span>
      </div>
      <div className="mt-2 space-y-1">
        <Row
          color={MANUAL}
          label={manualLegend}
          value={fmtSol(row.manual)}
          pctOf={pct(row.manual, row.total)}
        />
        <Row
          color={BOT}
          label={botLegend}
          value={fmtSol(row.bot)}
          pctOf={pct(row.bot, row.total)}
        />
      </div>
    </div>
  );
}

function Row({
  color,
  label,
  value,
  pctOf,
}: {
  color: string;
  label: string;
  value: string;
  pctOf: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="size-2 shrink-0 rounded-sm"
        style={{ background: color }}
        aria-hidden
      />
      <span className="text-white/55">{label}</span>
      <span className="ml-auto tabular-nums text-white/90">{value}</span>
      <span className="w-9 text-right text-[10px] tabular-nums text-white/35">
        {pctOf}%
      </span>
    </div>
  );
}
