"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { useInView, useReducedMotion } from "motion/react";

import { BellIcon } from "../icons/bell-icon";
import BundleHoldingIcon from "../icons/bundle-holding-icon";
import DepositIcon from "../icons/deposit-icon";
import DevHoldingIcon from "../icons/dev-holding-icon";
import DexScreenerIcon from "../icons/dexscreener-icon";
import FeeAuthorityIcon from "../icons/fee-authority-icon";
import FunnelIcon from "../icons/funnel-icon";
import GridViewIcon from "../icons/grid-view-icon";
import HolderConcentrationIcon from "../icons/holder-concentration-icon";
import InsidersHoldingIcon from "../icons/insiders-holding-icon";
import LightningBoltIcon from "../icons/lightning-bolt-icon";
import LiquidityIcon from "../icons/liquidity-icon";
import {
  PhaseBribeTipIcon,
  PhaseGasIcon,
  PhaseShieldIcon,
  PhaseSlippageIcon,
} from "../icons/phase-tooltip-icons";
import ProTradersIcon from "../icons/pro-traders-icon";
import { SearchIcon } from "../icons/search-icon";
import SettingsIcon from "../icons/settings-icon";
import ShieldCheckIcon from "../icons/shield-check-icon";
import SnipersHoldingIcon from "../icons/snipers-holding-icon";
import SolUsdIcon from "../icons/sol-usd-icon";
import SolanaBlackIcon from "../icons/solana-black-icon";
import SolanaIcon from "../icons/solana-icon";
import SolanaWhiteIcon from "../icons/solana-white-icon";
import SolscanLogoIcon from "../icons/solscan-logo-icon";
import UsdcWhiteIcon from "../icons/usdc-white-icon";
import WideChartLayoutIcon from "../icons/wide-chart-layout-icon";
import { TerminalDemoChart } from "./terminal-demo-chart";
import {
  buildHistory,
  CANDLE_EVERY_S,
  CANDLE_SPAN_S,
  chartMc,
  compactCount,
  compactUsd,
  DEMO_TOKEN,
  formatAge,
  makeTrade,
  rng,
  seedTrades,
  shortenMint,
  START_MC,
  subscriptPrice,
  type DemoCandle,
  type DemoTrade,
} from "./terminal-demo-data";

const W = 1440;
const H = 860;
const BUY = "#29db95";
const SELL = "#ff5b7b";

type Bar = Omit<DemoCandle, "time">;

type Sim = {
  sec: number;
  mc: number;
  candle: number;
  bar: Bar;
  trades: DemoTrade[];
  nextId: number;
  buys: number;
  buyUsd: number;
  sells: number;
  sellUsd: number;
};

function initialSim(): Sim {
  const last = buildHistory(0).at(-1)!;
  return {
    sec: 0,
    mc: START_MC,
    candle: 0,
    bar: { open: last.open, high: last.high, low: last.low, close: last.close },
    trades: seedTrades(),
    nextId: 1,
    buys: 46,
    buyUsd: 1_720,
    sells: 38,
    sellUsd: 1_770,
  };
}

function step(s: Sim, rand: () => number): Sim {
  const sec = s.sec + 1;
  let { mc, candle, bar, nextId, buys, buyUsd, sells, sellUsd } = s;
  if (sec % CANDLE_EVERY_S === 0) {
    candle += 1;
    bar = { open: mc, high: mc, low: mc, close: mc };
  }
  const fresh: DemoTrade[] = [];
  const count = rand() < 0.45 ? 1 : 2;
  for (let i = 0; i < count; i += 1) {
    const trade = makeTrade(nextId, sec, mc, rand);
    nextId += 1;
    const impact = trade.usd / 52_000;
    mc *= trade.side === "buy" ? 1 + impact : 1 - impact;
    mc += (START_MC * 1.08 - mc) * 0.004;
    trade.mcUsd = mc;
    fresh.unshift(trade);
    if (trade.side === "buy") {
      buys += 1;
      buyUsd += trade.usd;
    } else {
      sells += 1;
      sellUsd += trade.usd;
    }
  }
  bar = {
    open: bar.open,
    close: mc,
    high: Math.max(bar.high, mc),
    low: Math.min(bar.low, mc),
  };
  return {
    sec,
    mc,
    candle,
    bar,
    trades: [...fresh, ...s.trades].slice(0, 14),
    nextId,
    buys,
    buyUsd,
    sells,
    sellUsd,
  };
}

/** Thin stroked glyph for chart chrome the app draws with TradingView icons. */
function Glyph({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx("size-[18px]", className)}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const G = {
  crosshair: "M12 3v18M3 12h18",
  plus: "M12 5v14M5 12h14M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  candles: "M8 4v16M6 7h4v8H6zM16 4v16M14 9h4v6h-4z",
  indicators: "M3 17l5-6 4 3 6-8 3 3",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-2",
  redo: "m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h2",
  zoom: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM21 21l-5-5M11 8v6M8 11h6",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 14H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3Z",
  fullscreen: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  trend: "M4 20 20 4M4 20h.01M20 4h.01",
  hlines: "M3 6h18M3 12h18M3 18h18M7 4v4M15 10v4M10 16v4",
  nodes: "M5 19 9 7l6 10 4-12M5 19h.01M9 7h.01M15 17h.01M19 5h.01",
  fib: "M3 5h18M3 10h18M3 15h18M3 20h18M6 20 18 5",
  brush: "M4 20c4 0 5-2 6-5l8-8a2 2 0 0 0-3-3l-8 8c-3 1-3 3-3 8Z",
  text: "M5 5h14M12 5v15M9 20h6",
  smile: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01",
  ruler: "m3 17 14-14 4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2",
  magnet: "M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3zM6 7h4M14 7h4",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  chevron: "m6 9 6 6 6-6",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  layers: "m12 3 9 5-9 5-9-5zM3 13l9 5 9-5",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  link: "M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  refresh: "M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4",
  pencil: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  x: "M4 4l16 16M20 4 4 20",
  discord: "M7 7c3-1.5 7-1.5 10 0l2 9c-2 2-4 2.5-5 2.5l-1-2M7 7 5 16c2 2 4 2.5 5 2.5l1-2M9.5 12.5h.01M14.5 12.5h.01",
  telegram: "m3 11 18-7-3 16-6-5-3 3v-5l9-7",
  wallet: "M4 7h15v12H4zM4 7l12-3v3M15 13h.01",
  fire: "M12 21c4 0 7-3 7-7 0-5-5-6-5-11-3 2-5 5-5 8-1-1-2-2-2-4-2 2-2 5-2 7 0 4 3 7 7 7Z",
};

function Divider() {
  return <span className="h-5 w-px bg-[rgba(255,255,255,0.15)]" />;
}

function Navbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/8 px-4">
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/terminal-demo/logo-mark.svg" alt="" className="h-6 w-auto" />
          <span className="text-[19px] font-semibold tracking-[-0.01em] text-white">
            TrenchersAI
          </span>
        </span>
        <nav className="flex items-center gap-1">
          {["Discover", "Trenches", "Trackers", "Portfolio", "Yield", "Rewards"].map(
            (l) => (
              <span key={l} className="rounded-lg px-2.5 py-1.5 text-[14px] font-medium text-white/80">
                {l}
              </span>
            ),
          )}
          <span className="ml-2 inline-flex h-8 items-center rounded-[8px] border border-white/10 bg-white/3 px-3 text-[12px] font-medium text-white">
            Trade with AI
          </span>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-md border border-white/10 text-white/70">
          <SearchIcon className="size-4" />
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#333] px-3 text-[13px] font-semibold text-white">
          <DepositIcon className="size-4" />
          Deposit
        </span>
        <span className="inline-flex items-center gap-2 rounded-md border border-[#292929] px-3 py-[7px] text-sm text-white">
          <Glyph d={G.wallet} className="size-4 text-white/70" />1
          <span className="h-4 w-px bg-white/10" />
          <SolanaWhiteIcon className="size-3.5" />0
          <span className="h-4 w-px bg-white/10" />
          <UsdcWhiteIcon className="size-3.5" />0
          <Glyph d={G.chevron} className="size-3.5 text-white/50" />
        </span>
        {[G.star, null, G.user].map((d, i) => (
          <span key={i} className="grid size-8 place-items-center rounded-md border border-white/10 text-white/70">
            {d ? <Glyph d={d} className="size-4" /> : <BellIcon className="size-4" />}
          </span>
        ))}
      </div>
    </header>
  );
}

function SubToolbar() {
  return (
    <div className="flex h-7 items-stretch border-b border-white/8 bg-[#101010]">
      {[G.gear, G.star, G.chart, G.layers, G.history].map((d, i) => (
        <span key={i} className="grid place-items-center border-r border-white/10 px-[11px] text-white/50">
          <Glyph d={d} className="size-3.5" />
        </span>
      ))}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-white/45">{label}</span>
      <span className="flex items-center gap-1 text-sm text-white tabular-nums">{children}</span>
    </div>
  );
}

function TokenHeader({ mc }: { mc: number }) {
  return (
    <section className="flex h-[62px] items-center justify-between px-2 py-[9.2px]">
      <div className="flex items-center gap-3">
        <span className="rounded-sm border border-[#12af80] p-0.5">
          <span className="grid size-10 place-items-center rounded-[3px] bg-[linear-gradient(135deg,#3f7d3a,#1b3b1f)] text-[17px] font-bold text-[#c9f27a]">
            G
          </span>
        </span>
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-white">{DEMO_TOKEN.ticker}</span>
            <span className="text-xs text-white/45">{DEMO_TOKEN.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/50">
            <span className="text-xs text-[#12af80]">{DEMO_TOKEN.ageLabel}</span>
            <Glyph d={G.link} className="size-3.5" />
            <Glyph d={G.globe} className="size-3.5" />
            <SearchIcon className="size-3.5" />
            <Glyph d={G.x} className="size-3" />
          </div>
        </div>
        <div className="ml-4 flex items-center md:gap-8">
          <span className="w-[4.5rem] text-[18px] font-semibold text-white tabular-nums">
            {compactUsd(mc)}
          </span>
          <Stat label="Price">{subscriptPrice(mc / DEMO_TOKEN.supply)}</Stat>
          <Stat label="Liquidity">{compactUsd(DEMO_TOKEN.liquidityUsd)}</Stat>
          <Stat label="Supply">1B</Stat>
          <Stat label="Global Fees Paid">
            <SolanaIcon className="size-3.5" />
            {DEMO_TOKEN.feesPaidSol}
          </Stat>
          <Stat label="B.Curve">{DEMO_TOKEN.bondingPct.toFixed(2)}%</Stat>
          <Stat label="ATH">{compactUsd(Math.max(DEMO_TOKEN.athUsd, mc))}</Stat>
        </div>
      </div>
      <div className="flex items-center gap-2 pr-2 text-white/60">
        <SettingsIcon className="size-4" />
        <span className="grid size-8 place-items-center">
          <WideChartLayoutIcon className="size-4" />
        </span>
      </div>
    </section>
  );
}

function ChartPanel({
  epoch,
  history,
  live,
  clock,
}: {
  epoch: number | null;
  history: DemoCandle[] | null;
  live: DemoCandle | null;
  clock: string;
}) {
  const up = live ? live.close >= live.open : true;
  const tone = up ? "text-[#089981]" : "text-[#F23645]";
  const chg = live ? live.close - live.open : 0;
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#101010]">
      <div className="flex h-[42px] items-center justify-between border-b border-white/[0.07] px-2 text-[13px] font-medium text-[rgba(255,255,255,0.8)]">
        <div className="flex items-center gap-3">
          <Glyph d={G.plus} />
          <span className="font-semibold">1m</span>
          <Divider />
          <Glyph d={G.candles} />
          <Divider />
          <span className="flex items-center gap-1.5">
            <Glyph d={G.indicators} />
            Indicators
          </span>
          <Divider />
          <span className="flex items-center gap-1">
            <Glyph d={G.chevron} className="size-3.5" />
            Display Options
          </span>
          <Divider />
          <span>Hide All Bubbles</span>
          <Divider />
          <span>
            <span className="text-[#4d9fff]">USD</span> / SOL
          </span>
          <Divider />
          <span>
            <span className="text-[#4d9fff]">MarketCap</span> / Price
          </span>
          <Divider />
          <span className="flex items-center gap-2 text-white/35">
            <Glyph d={G.undo} className="size-4" />
            <Glyph d={G.redo} className="size-4" />
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Glyph d={G.zoom} />
          <Glyph d={G.gear} />
          <Glyph d={G.fullscreen} />
          <Glyph d={G.camera} />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[52px] flex-col items-center gap-[14px] border-r border-white/[0.07] pt-3 text-[rgba(255,255,255,0.75)]">
          <span className="grid size-8 place-items-center rounded bg-white/10">
            <Glyph d={G.crosshair} />
          </span>
          {[G.trend, G.hlines, G.nodes, G.fib, G.brush, G.text, G.smile, G.ruler, G.zoom, G.magnet, G.lock, G.eye].map(
            (d, i) => (
              <Glyph key={i} d={d} />
            ),
          )}
        </div>
        <div className="relative min-w-0 flex-1">
          {epoch !== null && history && live ? (
            <TerminalDemoChart history={history} live={live} />
          ) : null}
          <div className="pointer-events-none absolute left-3 top-2 z-10 flex items-center gap-2 text-[13px]">
            <span className="font-medium text-[rgba(255,255,255,0.9)]">
              {DEMO_TOKEN.name} · 1 · TRENCHERS
            </span>
            {live ? (
              <span className={clsx("flex gap-2 tabular-nums", tone)}>
                <span><span className="text-white/60">O</span>{chartMc(live.open)}</span>
                <span><span className="text-white/60">H</span>{chartMc(live.high)}</span>
                <span><span className="text-white/60">L</span>{chartMc(live.low)}</span>
                <span><span className="text-white/60">C</span>{chartMc(live.close)}</span>
                <span>
                  {chg >= 0 ? "+" : "-"}
                  {chartMc(Math.abs(chg))} ({chg >= 0 ? "+" : ""}
                  {((chg / live.open) * 100).toFixed(2)}%)
                </span>
              </span>
            ) : null}
          </div>
          <span className="pointer-events-none absolute bottom-8 left-3 z-10 text-[17px] font-black italic tracking-[-0.06em] text-white/85">
            TV
          </span>
        </div>
      </div>
      <div className="flex h-[39px] items-center justify-between border-t border-white/[0.07] px-3 text-[13px] font-medium text-[rgba(255,255,255,0.8)]">
        <div className="flex items-center gap-3">
          <span>3m</span>
          <span>5d</span>
          <span>1d</span>
          <Divider />
          <Glyph d={G.calendar} className="size-4" />
        </div>
        <div className="flex items-center gap-3">
          <span className="tabular-nums">{clock}</span>
          <Divider />
          <span>%</span>
          <span>log</span>
          <span className="rounded bg-white/15 px-1.5 py-0.5">auto</span>
        </div>
      </div>
    </div>
  );
}

function DarkDivider() {
  return (
    <div className="h-[1.5px] shrink-0 bg-[rgba(0,0,0,0.9)] shadow-[0_1px_0_0_rgba(255,255,255,0.08)]" />
  );
}

const TABS = ["Trades", "Positions", "Orders", "Holders", "Top Traders", "Dev Tokens (63)"];
const COLS = "grid grid-cols-[110px_110px_150px_150px_1fr_170px] items-center px-3";

function TradesPanel({ trades, now }: { trades: DemoTrade[]; now: number }) {
  return (
    <section className="flex h-[262px] shrink-0 flex-col overflow-hidden bg-[#0a0a0a]">
      <div className="flex h-9 shrink-0 items-stretch justify-between border-b border-white/8 px-3">
        <div className="flex items-stretch">
          {TABS.map((t, i) => (
            <span
              key={t}
              className={clsx(
                "flex items-center px-2.5 text-sm",
                i === 0
                  ? "border-b border-[#fafafa] bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.05))] text-[rgba(255,255,255,0.9)]"
                  : "text-white/45",
              )}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-white/70">
          <span className="inline-flex items-center gap-1 rounded border border-[#4D68FF] px-2.5 py-1 text-xs text-[#4D68FF]">
            <LightningBoltIcon className="size-3" />
            Instant Trade
          </span>
          <span className="flex items-center gap-1.5">
            <GridViewIcon className="size-3.5" />
            Trades Panel
          </span>
          <span className="flex items-center gap-1">
            <FunnelIcon className="size-3" />
            DEV
          </span>
          <span className="flex items-center gap-1">
            <FunnelIcon className="size-3" />
            TRACKED
          </span>
          <span className="flex items-center gap-1">
            <FunnelIcon className="size-3" />
            YOU
          </span>
          <SettingsIcon className="size-3.5 text-white/50" />
        </div>
      </div>
      <div className={clsx(COLS, "py-2 text-[11px] text-white/45")}>
        <span>Age ↓</span>
        <span>Type</span>
        <span>MC</span>
        <span>Amount</span>
        <span>Total USD</span>
        <span className="text-right">Trader</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {trades.map((t, i) => {
          const buy = t.side === "buy";
          const rgb = buy ? "41,219,149" : "255,91,123";
          return (
            <div
              key={t.id}
              className={clsx(
                COLS,
                "h-[42px] border-t border-white/5 font-mono text-xs text-white/80 tabular-nums",
                i % 2 === 1 && "bg-white/[0.015]",
              )}
            >
              <span className="text-white/55">{formatAge(now - t.t)}</span>
              <span
                className="font-sans font-semibold"
                style={{ color: buy ? BUY : SELL }}
              >
                {buy ? "Buy" : "Sell"}
              </span>
              <span>{compactUsd(t.mcUsd)}</span>
              <span>{compactCount(t.tokenAmount)}</span>
              <span className="relative flex h-full items-center">
                <span
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: Math.min(120, 56 + (t.usd / 800) * 64),
                    background: `linear-gradient(90deg, rgba(${rgb},0.18) 0%, rgba(${rgb},0.08) 55%, transparent)`,
                  }}
                />
                <span className="relative pl-2" style={{ color: buy ? BUY : SELL }}>
                  ${t.usd.toFixed(2)}
                </span>
              </span>
              <span className="flex items-center justify-end gap-1.5 text-white/60">
                {shortenMint(t.trader)}
                <SolUsdIcon className="size-3.5 text-white/35" />
                <FunnelIcon className="size-3.5 text-white/35" />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function VolumeStats({ sim }: { sim: Sim }) {
  const total = sim.buyUsd + sim.sellUsd;
  const net = sim.buyUsd - sim.sellUsd;
  return (
    <div className="flex h-[62px] flex-col justify-center px-3">
      <div className="grid grid-cols-4">
        <div>
          <div className="text-[11px] text-white/45">5m Vol</div>
          <div className="mt-1.5 text-[11px] text-white tabular-nums">{compactUsd(total)}</div>
        </div>
        <div>
          <div className="text-[11px] text-white/45">Buys</div>
          <div className="mt-1.5 text-[11px] text-[#38e38a] tabular-nums">
            {sim.buys} / {compactUsd(sim.buyUsd)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-white/45">Sells</div>
          <div className="mt-1.5 text-[11px] text-[#ff4d67] tabular-nums">
            {sim.sells} / {compactUsd(sim.sellUsd)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-white/45">Net Vol.</div>
          <div
            className="mt-1.5 text-[11px] tabular-nums"
            style={{ color: net >= 0 ? "#38e38a" : "#ff4d67" }}
          >
            {compactUsd(net)}
          </div>
        </div>
      </div>
      <div className="mt-2 flex h-0.5 gap-0.5">
        <span className="bg-[#38e38a]" style={{ width: `${(sim.buyUsd / total) * 100}%` }} />
        <span className="flex-1 bg-[#ff4d67]" />
      </div>
    </div>
  );
}

function TradeForm() {
  return (
    <div className="space-y-2 p-3">
      <div className="grid grid-cols-2 gap-2">
        <span className="rounded bg-[#2FE0E3] py-1.5 text-center text-sm font-bold text-black">Buy</span>
        <span className="rounded border border-white/10 py-1.5 text-center text-sm font-bold text-white/70">
          Sell
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs">
          <span className="px-2.5 py-1 text-white">Market</span>
          <span className="h-3 w-px bg-white/10" />
          <span className="px-2.5 py-1 text-white/45">Limit</span>
          <span className="h-3 w-px bg-white/10" />
          <span className="px-2.5 py-1 text-white/45">Adv.</span>
        </div>
        <span className="flex items-center gap-1.5 rounded-md border border-white/6 px-2 py-1 text-[11px] text-white/80">
          <DepositIcon className="size-3" />1
          <SolanaWhiteIcon className="size-3" />
          0.00
        </span>
      </div>
      <div className="flex items-center justify-between py-1 text-xs text-white/50">
        Pay with
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-[#4D68FF]/20 px-2 py-0.5 text-[#8ea4ff]">
            <SolanaWhiteIcon className="size-3" />
            SOL
          </span>
          <span className="flex items-center gap-1 text-white/40">
            <UsdcWhiteIcon className="size-3" />
            USDC
          </span>
        </span>
      </div>
      <div className="overflow-hidden rounded-md border border-white/6">
        <div className="flex items-center justify-between bg-white/[0.06] px-3 py-2 text-xs">
          <span className="text-white/60">AMOUNT</span>
          <span className="flex items-center gap-1.5 text-white/40">
            0.0
            <SolanaWhiteIcon className="size-3.5 text-white/70" />
          </span>
        </div>
        <div className="grid grid-cols-5 text-xs text-white/80">
          {["0.01", "0.1", "1", "10"].map((a) => (
            <span key={a} className="border-r border-white/6 py-1.5 text-center">
              {a}
            </span>
          ))}
          <span className="grid place-items-center py-1.5">
            <Glyph d={G.pencil} className="size-3" />
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-white/50">
        <span className="flex items-center gap-1">
          <PhaseSlippageIcon className="size-3" />
          10%
        </span>
        <span className="flex items-center gap-1">
          <PhaseGasIcon className="size-3" />
          0.001
        </span>
        <span className="flex items-center gap-1 text-[#f6c64d]">
          <PhaseBribeTipIcon className="size-3" />
          0.001
        </span>
        <span className="flex items-center gap-1 text-[#2FE0E3]">
          <PhaseShieldIcon className="size-3" />
          Secure
        </span>
      </div>
      <div className="flex items-center justify-between pt-1 text-xs text-white/80">
        Advanced Trading Strategy
        <span className="relative h-5 w-9 rounded-full bg-white/15">
          <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white" />
        </span>
      </div>
      <span className="mt-6 flex w-full items-center justify-center gap-1 rounded-lg bg-[#2FE0E3] py-2 text-sm font-semibold text-black">
        Buy {DEMO_TOKEN.ticker}
        <SolanaBlackIcon className="size-3.5" />0
      </span>
      <p className="text-center text-xs text-white/45">Enter an amount</p>
    </div>
  );
}

function PositionFooter() {
  const cells = [
    { v: "0", c: "#38e38a" },
    { v: "0", c: "#ff4d67" },
    { v: "0", c: "rgba(255,255,255,0.85)" },
    { v: "+0 (+0%)", c: "#38e38a" },
  ];
  return (
    <div className="flex h-10 items-center border-y border-white/8">
      {cells.map((cell, i) => (
        <div key={i} className="flex flex-1 items-center">
          {i > 0 ? <span className="h-5 w-px bg-white/8" /> : null}
          <span className="flex flex-1 items-center justify-center gap-1 text-xs" style={{ color: cell.c }}>
            <SolanaWhiteIcon className="size-3 text-[#4D68FF]" />
            {cell.v}
          </span>
        </div>
      ))}
    </div>
  );
}

const TONE = {
  danger: "#e45a5a",
  warn: "#f0b04a",
  safe: "#12af80",
  unknown: "#545454",
  ok: "#21975A",
} as const;

const INFO: { label: string; value: string; tone: keyof typeof TONE; Icon: (p: { className?: string }) => ReactNode }[] = [
  { label: "Top 10 H.", value: "24.8%", tone: "safe", Icon: HolderConcentrationIcon },
  { label: "Dev holding", value: "3.2%", tone: "warn", Icon: DevHoldingIcon },
  { label: "Bundlers", value: "—", tone: "unknown", Icon: BundleHoldingIcon },
  { label: "Insiders H.", value: "1.6%", tone: "danger", Icon: InsidersHoldingIcon },
  { label: "Bundles H.", value: "4.1%", tone: "safe", Icon: BundleHoldingIcon },
  { label: "Burned Liq.", value: "Yes", tone: "safe", Icon: LiquidityIcon },
  { label: "Markets", value: "0", tone: "ok", Icon: LiquidityIcon },
  { label: "Sniper hold", value: "5.4%", tone: "warn", Icon: SnipersHoldingIcon },
  { label: "Mint Auth.", value: "No", tone: "safe", Icon: ShieldCheckIcon },
  { label: "Dex Paid", value: "—", tone: "unknown", Icon: DexScreenerIcon },
  { label: "Pro Traders", value: "0", tone: "ok", Icon: ProTradersIcon },
  { label: "Tax", value: "—", tone: "unknown", Icon: FeeAuthorityIcon },
];

function TokenInfo() {
  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-white">Token Info</span>
        <Glyph d={G.refresh} className="size-3.5 text-white/50" />
      </div>
      <div className="grid grid-cols-3 overflow-hidden rounded-md border border-white/6">
        {INFO.map(({ label, value, tone, Icon }, i) => (
          <div
            key={label}
            className={clsx(
              "flex flex-col items-center px-2 py-4",
              i % 3 !== 2 && "border-r border-white/6",
              i < 9 && "border-b border-white/6",
            )}
          >
            <span className="flex items-center gap-1 text-[14px] font-medium" style={{ color: TONE[tone] }}>
              <Icon className="size-3.5" />
              {value}
            </span>
            <span className="mt-1 text-[11px] text-white/70">{label}</span>
          </div>
        ))}
      </div>
      {[
        ["CA:", DEMO_TOKEN.mint],
        ["DA:", DEMO_TOKEN.dev],
      ].map(([k, v]) => (
        <div key={k} className="mt-3 flex items-center gap-2 text-[14px] text-white/85">
          <Glyph d={G.copy} className="size-3.5 text-white/50" />
          <span className="text-white/70">{k}</span>
          {shortenMint(v!)}
          <SolscanLogoIcon className="ml-auto size-3.5" />
        </div>
      ))}
    </div>
  );
}

function BottomStrip() {
  return (
    <footer className="flex min-h-7 items-center justify-between border-t border-white/8 px-6 text-[12px] text-white/60">
      <div className="flex items-center gap-4">
        <span className="inline-flex h-6 items-center rounded border border-blue-500/30 bg-[linear-gradient(180deg,#0d2a4a_0%,#0a1f3a_100%)] px-2.5 font-semibold text-[#6eb6ff]">
          PRESET 1
        </span>
        <span className="flex items-center gap-1.5 text-white/80">
          <Glyph d={G.wallet} className="size-3.5" />1
          <SolanaWhiteIcon className="size-3" />0
        </span>
        <span className="h-4 w-px bg-white/10" />
        {["Wallet", "Discover", "Trenches", "PnL", "Alpha"].map((l) => (
          <span key={l}>{l}</span>
        ))}
        <span className="flex items-center gap-1 text-[#3dcc9d]">
          <SolanaIcon className="size-3" />${150}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span>Trade with AI</span>
        <Glyph d={G.x} className="size-3" />
        <Glyph d={G.discord} className="size-3.5" />
        <Glyph d={G.telegram} className="size-3.5" />
        <span className="inline-flex h-6 items-center rounded bg-[#333] px-2.5 text-xs text-white">Docs</span>
        <span className="inline-flex h-6 items-center rounded bg-[#333] px-2.5 text-xs text-white">Support</span>
      </div>
    </footer>
  );
}

function utcClock(ms: number) {
  return `${new Date(ms).toISOString().slice(11, 19)} UTC`;
}

/**
 * Display-only replica of the token terminal (`/terminal/:mint`) for the
 * landing page. Laid out on a fixed 1440×860 canvas and scaled to fit, so it
 * keeps the app's proportions at any width. The market is simulated locally.
 */
export function TerminalDemo() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const inView = useInView(frameRef, { margin: "200px" });
  const reduced = useReducedMotion();

  const [sim, setSim] = useState(initialSim);
  const simRef = useRef(sim);
  const randRef = useRef(rng(53));
  const [mountMs, setMountMs] = useState<number | null>(null);
  const [history, setHistory] = useState<DemoCandle[] | null>(null);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const now = Date.now();
      setMountMs(now);
      setHistory(buildHistory(Math.floor(now / 1000 / CANDLE_SPAN_S) * CANDLE_SPAN_S).slice(0, -1));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!inView || reduced) return;
    const id = window.setInterval(() => {
      simRef.current = step(simRef.current, randRef.current);
      setSim(simRef.current);
    }, 350);
    return () => window.clearInterval(id);
  }, [inView, reduced]);

  const epoch =
    mountMs === null ? null : Math.floor(mountMs / 1000 / CANDLE_SPAN_S) * CANDLE_SPAN_S;
  const live: DemoCandle | null =
    epoch === null ? null : { time: epoch + sim.candle * CANDLE_SPAN_S, ...sim.bar };
  const clock = mountMs === null ? "" : utcClock(mountMs + sim.sec * 1000);

  return (
    <div
      ref={frameRef}
      aria-hidden
      className="pointer-events-none relative w-full select-none overflow-hidden"
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      <div
        className={clsx(
          "absolute left-0 top-0 flex flex-col bg-[#0a0a0a] font-sans text-white",
          scale === 0 && "invisible",
        )}
        style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "0 0" }}
      >
        <Navbar />
        <SubToolbar />
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <TokenHeader mc={sim.mc} />
            <div className="h-px bg-white/8" />
            <ChartPanel epoch={epoch} history={history} live={live} clock={clock} />
            <DarkDivider />
            <TradesPanel trades={sim.trades} now={sim.sec} />
          </div>
          <aside className="flex w-[320px] shrink-0 flex-col overflow-hidden border-l border-white/8 bg-[#101010] pr-2">
            <VolumeStats sim={sim} />
            <div className="h-px bg-white/8" />
            <TradeForm />
            <PositionFooter />
            <div className="grid grid-cols-3 gap-1 p-3 text-xs">
              {["PRESET 1", "PRESET 2", "PRESET 3"].map((p, i) => (
                <span
                  key={p}
                  className={clsx(
                    "rounded py-1.5 text-center",
                    i === 0 ? "bg-[#1d3d61]/20 text-[#4081CC]" : "text-white/45",
                  )}
                >
                  {p}
                </span>
              ))}
            </div>
            <div className="h-px bg-white/8" />
            <TokenInfo />
          </aside>
        </div>
        <BottomStrip />
      </div>
    </div>
  );
}
