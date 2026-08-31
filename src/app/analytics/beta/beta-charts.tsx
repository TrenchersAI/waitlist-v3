"use client";

import * as React from "react";

// Chart primitives for the Beta access tab. Hand-rolled SVG to match the
// rest of the dashboard, which draws its own charts rather than pulling in a
// charting library.
//
// Colour discipline: white is the data ink for volume, and semantic hues are
// reserved for health (emerald ok, amber watch, rose critical). A number is
// never coloured for decoration, only when its colour means something.

export const OK = "rgb(52 211 153)";
export const WATCH = "rgb(251 191 36)";
export const BAD = "rgb(251 113 133)";
export const INK = "rgb(255 255 255)";
export const INK_DIM = "rgba(255,255,255,0.28)";

export function toneFor(rate: number, pause: number, limit: number) {
  if (rate >= limit) return BAD;
  if (rate >= pause) return WATCH;
  return OK;
}

/// Semicircular gauge showing a rate against the threshold that would pause
/// the send and the hard limit that would suspend the account. The point of
/// the arc is headroom, not the raw number, so the limit is drawn as a tick
/// on the same scale rather than being left to the reader's imagination.
export function RateGauge({
  label,
  rate,
  pause,
  limit,
  count,
  denom,
  precision = 2,
  measured,
}: {
  label: string;
  rate: number;
  pause: number;
  limit: number;
  count: number;
  denom: number;
  precision?: number;
  measured: boolean;
}) {
  const W = 200;
  const H = 116;
  const cx = W / 2;
  const cy = 100;
  const r = 76;
  // Scale the arc so the hard limit sits at 85% of the sweep. That keeps the
  // needle in a readable range while still showing an overshoot.
  const full = limit / 0.85;
  const frac = Math.max(0, Math.min(1, rate / full));
  const tone = measured ? toneFor(rate, pause, limit) : INK_DIM;

  const polar = (t: number) => {
    const a = Math.PI * (1 - t);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as const;
  };
  const arc = (from: number, to: number) => {
    const [x1, y1] = polar(from);
    const [x2, y2] = polar(to);
    const large = to - from > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const limitTick = polar(limit / full);
  const pauseTick = polar(pause / full);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-white/45">
          {label}
        </span>
        <span className="text-[11px] text-white/30">
          limit {(limit * 100).toFixed(limit < 0.01 ? 2 : 0)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
           aria-label={`${label} ${(rate * 100).toFixed(precision)} percent`}>
        <path d={arc(0, 1)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10"
              strokeLinecap="round" />
        {frac > 0.004 ? (
          <path d={arc(0, frac)} fill="none" stroke={tone} strokeWidth="10"
                strokeLinecap="round" />
        ) : null}
        <line x1={pauseTick[0]} y1={pauseTick[1]}
              x2={cx + (r + 9) * Math.cos(Math.PI * (1 - pause / full))}
              y2={cy - (r + 9) * Math.sin(Math.PI * (1 - pause / full))}
              stroke={WATCH} strokeWidth="1.5" opacity="0.55" />
        <line x1={limitTick[0]} y1={limitTick[1]}
              x2={cx + (r + 9) * Math.cos(Math.PI * (1 - limit / full))}
              y2={cy - (r + 9) * Math.sin(Math.PI * (1 - limit / full))}
              stroke={BAD} strokeWidth="1.5" opacity="0.7" />
        <text x={cx} y={cy - 22} textAnchor="middle"
              className="fill-white text-[26px] font-medium"
              style={{ fontVariantNumeric: "tabular-nums" }}>
          {measured ? `${(rate * 100).toFixed(precision)}%` : "n/a"}
        </text>
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-white/35 text-[10px]">
          {measured ? `${count} of ${denom}` : "not measured"}
        </text>
      </svg>
    </div>
  );
}

/// Funnel drawn as nested bars with the drop between adjacent stages called
/// out. The drop is the interesting number: a wide gap between "sent" and
/// "delivered" is a deliverability problem, between "delivered" and "signed
/// in" a product one.
export function Funnel({
  steps,
}: {
  steps: { key: string; label: string; count: number; note: string }[];
}) {
  const top = steps[0]?.count ?? 0;
  return (
    <div className="flex flex-col gap-3">
      {steps.map((s, i) => {
        const pct = top > 0 ? (s.count / top) * 100 : 0;
        const prev = i > 0 ? steps[i - 1].count : null;
        const drop = prev !== null && prev > 0 ? prev - s.count : null;
        const dropPct = prev !== null && prev > 0 ? (drop! / prev) * 100 : null;
        return (
          <div key={s.key} className="min-w-0" title={s.note}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-white/75">{s.label}</span>
              <span className="shrink-0 text-sm tabular-nums text-white">
                {s.count.toLocaleString()}
                <span className="ml-2 text-white/35">{pct.toFixed(1)}%</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-white/85 transition-[width] duration-500"
                style={{ width: `${Math.max(pct, pct > 0 ? 0.6 : 0)}%` }}
              />
            </div>
            {dropPct !== null && drop! > 0 ? (
              <div className="mt-1 text-[11px] text-white/30">
                {drop!.toLocaleString()} lost here ({dropPct.toFixed(1)}%)
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/// Hourly send timeline. Delivered is drawn inside sent as a subset rather
/// than beside it, because the gap between the two IS the pending or failed
/// volume and reads better as a shortfall than as a second bar.
export function Timeline({
  points,
}: {
  points: { bucket: string; sent: number; delivered: number; bounced: number; complained: number }[];
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  if (points.length === 0) {
    return (
      <div className="grid h-40 place-items-center text-sm text-white/30">
        No send activity yet.
      </div>
    );
  }
  const W = 720;
  const H = 200;
  const PAD_L = 34;
  const PAD_R = 10;
  const PAD_T = 14;
  const PAD_B = 26;
  const max = Math.max(...points.map((p) => Math.max(p.sent, p.delivered)), 1);
  const bw = (W - PAD_L - PAD_R) / points.length;
  const x = (i: number) => PAD_L + i * bw;
  const y = (v: number) => PAD_T + (1 - v / max) * (H - PAD_T - PAD_B);
  const barW = Math.max(2, Math.min(bw - 3, 26));

  const ticks = [0, Math.round(max / 2), max];
  const active = hover !== null ? points[hover] : null;

  return (
    <div className="relative min-w-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
           aria-label="Hourly send timeline"
           onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} y1={y(t)} x2={W - PAD_R} y2={y(t)}
                  stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <text x={PAD_L - 7} y={y(t) + 3} textAnchor="end"
                  className="fill-white/30 text-[9px]"
                  style={{ fontVariantNumeric: "tabular-nums" }}>{t}</text>
          </g>
        ))}
        {points.map((p, i) => {
          const cx = x(i) + (bw - barW) / 2;
          const isHot = hover === i;
          return (
            <g key={p.bucket}
               onMouseEnter={() => setHover(i)}>
              <rect x={x(i)} y={PAD_T} width={bw} height={H - PAD_T - PAD_B}
                    fill="transparent" />
              <rect x={cx} y={y(p.sent)} width={barW}
                    height={Math.max(0, y(0) - y(p.sent))}
                    rx="2" fill={isHot ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.18)"} />
              <rect x={cx} y={y(p.delivered)} width={barW}
                    height={Math.max(0, y(0) - y(p.delivered))}
                    rx="2" fill={isHot ? INK : "rgba(255,255,255,0.8)"} />
              {p.bounced > 0 ? (
                <rect x={cx} y={y(0) - 3} width={barW} height="3" rx="1" fill={BAD} />
              ) : null}
              {p.complained > 0 ? (
                <circle cx={cx + barW / 2} cy={y(p.sent) - 6} r="2.5" fill={BAD} />
              ) : null}
            </g>
          );
        })}
        <line x1={PAD_L} y1={y(0)} x2={W - PAD_R} y2={y(0)}
              stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/40">
        <Legend swatch="rgba(255,255,255,0.8)" label="Delivered" />
        <Legend swatch="rgba(255,255,255,0.22)" label="Accepted, not yet delivered" />
        <Legend swatch={BAD} label="Bounced or complained" />
        {active ? (
          <span className="ml-auto tabular-nums text-white/70">
            {active.bucket.replace("T", " ")}:00 UTC &middot; {active.sent} sent,{" "}
            {active.delivered} delivered
            {active.bounced > 0 ? `, ${active.bounced} bounced` : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Legend({
  swatch,
  label,
  outline,
}: {
  swatch: string;
  label: string;
  /// Draw the swatch as a bordered box, matching a series the chart renders
  /// as an outline rather than a fill.
  outline?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block size-2 rounded-[2px]"
        style={{
          background: swatch,
          border: outline ? "1px solid rgba(255,255,255,0.45)" : undefined,
        }}
      />
      {label}
    </span>
  );
}

/// Thin inline bar for table cells, so a rate can be compared down a column
/// at a glance instead of read digit by digit.
export function MiniBar({ value, tone = "rgba(255,255,255,0.7)" }: { value: number; tone?: string }) {
  return (
    <span className="inline-flex h-1.5 w-14 overflow-hidden rounded-full bg-white/[0.07] align-middle">
      <span className="h-full rounded-full"
            style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: tone }} />
    </span>
  );
}

/// Horizontal breakdown for categorical counts (event types, bounce reasons).
export function Breakdown({
  rows,
  tone = "rgba(255,255,255,0.75)",
  empty,
}: {
  rows: { label: string; count: number }[];
  tone?: string;
  empty: string;
}) {
  if (rows.length === 0) {
    return <div className="py-6 text-center text-sm text-white/30">{empty}</div>;
  }
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="mb-1 truncate font-mono text-[11px] text-white/60">{r.label}</div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full"
                   style={{ width: `${(r.count / max) * 100}%`, background: tone }} />
            </div>
          </div>
          <span className="tabular-nums text-sm text-white/80">{r.count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

/// Batch cadence for a live rollout, in 15-minute buckets.
///
/// This is deliberately not the hourly Timeline. A send that paces one batch
/// every ~15 minutes looks perfectly healthy at hourly resolution even after
/// the sender has died, because the hour containing the last three batches
/// still shows a tall bar. At the batch resolution a dead sender shows up
/// immediately as a run of empty buckets.
export function CadenceBars({
  points,
  batchSize,
}: {
  points: { bucket: string; sent: number; delivered: number; bounced: number }[];
  batchSize: number;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  if (points.length === 0) {
    return (
      <div className="grid h-36 place-items-center text-sm text-white/30">
        No batches sent yet.
      </div>
    );
  }
  const W = 720;
  const H = 170;
  const PAD_L = 34;
  const PAD_R = 10;
  const PAD_T = 14;
  const PAD_B = 24;
  const max = Math.max(...points.map((p) => p.sent), batchSize, 1);
  const bw = (W - PAD_L - PAD_R) / points.length;
  const x = (i: number) => PAD_L + i * bw;
  const y = (v: number) => PAD_T + (1 - v / max) * (H - PAD_T - PAD_B);
  const barW = Math.max(2, Math.min(bw - 3, 22));
  const active = hover !== null ? points[hover] : null;
  const clock = (iso: string) => iso.slice(11, 16);

  return (
    <div className="relative min-w-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Batch cadence"
        onMouseLeave={() => setHover(null)}
      >
        {/* The declared batch size, so a short batch is visible as a bar that
            fails to reach the line rather than as a number nobody compares. */}
        <line
          x1={PAD_L}
          y1={y(batchSize)}
          x2={W - PAD_R}
          y2={y(batchSize)}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x={PAD_L - 7}
          y={y(batchSize) + 3}
          textAnchor="end"
          className="fill-white/35 text-[9px]"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {batchSize}
        </text>
        <text
          x={PAD_L}
          y={y(0) + 15}
          className="fill-white/25 text-[9px]"
        >
          {clock(points[0].bucket)} UTC
        </text>
        {points.length > 1 ? (
          <text
            x={W - PAD_R}
            y={y(0) + 15}
            textAnchor="end"
            className="fill-white/25 text-[9px]"
          >
            {clock(points[points.length - 1].bucket)} UTC
          </text>
        ) : null}
        {/* Sent is the outline, delivered is the fill inside it.
            Drawing them as two solid overlapping bars does not work: at a
            healthy delivery rate the delivered bar covers the sent bar
            completely, so the chart shows one series while the legend
            promises two, and the gap between them (the thing actually worth
            looking at) is exactly what disappears. As an outline the sent
            bar is always visible, and a delivery shortfall reads as an
            unfilled bar rather than as nothing at all. */}
        {points.map((p, i) => {
          const bx = x(i) + (bw - barW) / 2;
          const isHover = hover === i;
          return (
            <g key={p.bucket} onMouseEnter={() => setHover(i)}>
              <rect
                x={x(i)}
                y={PAD_T}
                width={bw}
                height={H - PAD_T - PAD_B}
                fill="transparent"
              />
              <rect
                x={bx + 0.5}
                y={y(p.sent)}
                width={barW - 1}
                height={Math.max(0, y(0) - y(p.sent))}
                rx="2"
                fill="rgba(255,255,255,0.06)"
                stroke={isHover ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)"}
                strokeWidth="1"
              />
              <rect
                x={bx + 2}
                y={y(p.delivered) + 2}
                width={barW - 4}
                height={Math.max(0, y(0) - y(p.delivered) - 2)}
                rx="1.5"
                fill={OK}
                opacity={isHover ? 0.95 : 0.8}
              />
              {p.bounced > 0 ? (
                <rect
                  x={bx + 2}
                  y={y(p.bounced)}
                  width={barW - 4}
                  height={Math.max(2, y(0) - y(p.bounced))}
                  rx="1.5"
                  fill={BAD}
                />
              ) : null}
            </g>
          );
        })}
        <line
          x1={PAD_L}
          y1={y(0)}
          x2={W - PAD_R}
          y2={y(0)}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
        />
      </svg>
      {active ? (
        <div className="pointer-events-none absolute right-2 top-1 rounded-md border border-white/12 bg-black/90 px-2.5 py-1.5 text-[11px] leading-relaxed">
          <div className="font-mono text-white/45">{clock(active.bucket)} UTC</div>
          <div className="text-white">{active.sent} sent</div>
          <div style={{ color: OK }}>{active.delivered} delivered</div>
          {active.bounced > 0 ? (
            <div style={{ color: BAD }}>{active.bounced} bounced</div>
          ) : null}
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/40">
        <Legend swatch="rgba(255,255,255,0.06)" label="Sent" outline />
        <Legend swatch={OK} label="Delivered" />
        <Legend swatch={BAD} label="Bounced" />
        <span className="text-white/30">Dashed line is the planned batch size</span>
      </div>
    </div>
  );
}
