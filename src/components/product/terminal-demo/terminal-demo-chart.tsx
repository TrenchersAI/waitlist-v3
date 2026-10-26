"use client";

import { useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";

import { chartMc, type DemoCandle } from "./terminal-demo-data";

/** TradingView's dark-theme defaults, which the terminal chart keeps. */
const UP = "#089981";
const DOWN = "#F23645";

function toBar(c: DemoCandle) {
  return {
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  };
}

/**
 * Same candles, drawn without the chart library. Shown while that module is
 * loading and kept if it fails, so the pane is never blank.
 */
function CandlePreview({ history, live }: { history: DemoCandle[]; live: DemoCandle }) {
  const bars = [...history, live];
  let min = Infinity;
  let max = -Infinity;
  for (const bar of bars) {
    min = Math.min(min, bar.low);
    max = Math.max(max, bar.high);
  }
  const span = Math.max(max - min, 1);
  const y0 = min - span * 0.08;
  const y1 = max + span * 0.08;
  const y = (value: number) => ((y1 - value) / (y1 - y0)) * 100;
  const slot = 1000 / bars.length;
  const body = slot * 0.62;

  return (
    <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      {bars.map((bar, index) => {
        const color = bar.close >= bar.open ? UP : DOWN;
        const x = index * slot + slot / 2;
        const top = y(Math.max(bar.open, bar.close));
        const bottom = y(Math.min(bar.open, bar.close));
        return (
          <g key={bar.time}>
            <line
              x1={x}
              x2={x}
              y1={y(bar.high)}
              y2={y(bar.low)}
              stroke={color}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <rect x={x - body / 2} y={top} width={body} height={Math.max(bottom - top, 0.35)} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Candles drawn with lightweight-charts, styled like the terminal's
 * TradingView pane. `history` seeds the series once; `live` is the candle
 * currently forming and is pushed with `update` on every change.
 */
export function TerminalDemoChart({
  history,
  live,
}: {
  history: DemoCandle[];
  live: DemoCandle;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const liveRef = useRef(live);
  const historyRef = useRef(history);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let chart: IChartApi | null = null;
    let disposed = false;

    const showPreview = () => {
      if (disposed) return;
      seriesRef.current = null;
      chart?.remove();
      chart = null;
      host.replaceChildren();
    };

    void import("lightweight-charts")
      .then(({ createChart, CandlestickSeries, ColorType, CrosshairMode, LineStyle }) => {
        if (disposed) return;
        try {
          chart = createChart(host, {
            autoSize: true,
            layout: {
              background: { type: ColorType.Solid, color: "#101010" },
              textColor: "rgba(178,181,190,0.85)",
              fontSize: 11,
            },
            grid: {
              vertLines: { color: "rgba(255,255,255,0.06)" },
              horzLines: { color: "rgba(255,255,255,0.06)" },
            },
            crosshair: { mode: CrosshairMode.Hidden },
            rightPriceScale: {
              borderColor: "rgba(255,255,255,0.07)",
              scaleMargins: { top: 0.14, bottom: 0.08 },
            },
            timeScale: {
              borderColor: "rgba(255,255,255,0.07)",
              timeVisible: true,
              secondsVisible: false,
              rightOffset: 5,
              barSpacing: 8,
            },
            handleScroll: false,
            handleScale: false,
            localization: { priceFormatter: chartMc },
          });
          const series = chart.addSeries(CandlestickSeries, {
            upColor: UP,
            downColor: DOWN,
            borderUpColor: UP,
            borderDownColor: DOWN,
            wickUpColor: UP,
            wickDownColor: DOWN,
            priceLineStyle: LineStyle.Dashed,
            priceFormat: { type: "custom", formatter: chartMc, minMove: 1 },
          });
          series.setData([...historyRef.current, liveRef.current].map(toBar));
          seriesRef.current = series;
        } catch {
          showPreview();
        }
      })
      .catch(() => {
        showPreview();
      });

    return () => {
      disposed = true;
      seriesRef.current = null;
      chart?.remove();
    };
  }, []);

  useEffect(() => {
    liveRef.current = live;
    const series = seriesRef.current;
    if (!series) return;
    try {
      series.update(toBar(live));
    } catch {
      seriesRef.current = null;
      hostRef.current?.replaceChildren();
    }
  }, [live]);

  return (
    <>
      <CandlePreview history={history} live={live} />
      <div ref={hostRef} className="absolute inset-0" />
    </>
  );
}
