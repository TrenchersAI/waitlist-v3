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

    void import("lightweight-charts").then(
      ({ createChart, CandlestickSeries, ColorType, CrosshairMode, LineStyle }) => {
        if (disposed) return;
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
      },
    );

    return () => {
      disposed = true;
      seriesRef.current = null;
      chart?.remove();
    };
  }, []);

  useEffect(() => {
    liveRef.current = live;
    seriesRef.current?.update(toBar(live));
  }, [live]);

  return <div ref={hostRef} className="absolute inset-0" />;
}
