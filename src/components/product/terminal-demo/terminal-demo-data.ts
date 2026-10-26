/**
 * Demo market for the landing-page terminal. Nothing here talks to a backend:
 * the token, its candles and its trades are generated in the browser.
 *
 * Time is "demo seconds" since mount, not wall-clock time, so the first
 * render is identical on the server and the client.
 */

export const DEMO_TOKEN = {
  ticker: "GOBLIN",
  name: "Goblin Mode",
  mint: "GobLNm8dQe7xR4tVwK2pYz9sHcJ3uFaB6nLqD5Mvpump",
  dev: "iGdF7xQ2mRtV9pLc4sNw8YbK3jHzE6uDa1oMvTr5Wq",
  supply: 1_000_000_000,
  ageLabel: "1h",
  liquidityUsd: 18_400,
  feesPaidSol: 12.4,
  bondingPct: 72.5,
  athUsd: 44_800,
};

export const SOL_USD = 150;

/** First market cap the demo opens at. */
export const START_MC = 41_200;

/** Real demo seconds between candles; each candle is labelled one minute. */
export const CANDLE_EVERY_S = 6;
export const CANDLE_SPAN_S = 60;

export type DemoCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type DemoTrade = {
  id: number;
  /** Demo second the trade landed at; age = now - t. */
  t: number;
  side: "buy" | "sell";
  mcUsd: number;
  tokenAmount: number;
  usd: number;
  trader: string;
};

/** Seeded PRNG (mulberry32): same numbers on the server and the client. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * History leading up to `START_MC`, ending on the bar that is open at demo
 * time 0. `epoch` is the unix second the chart labels that bar with.
 */
export function buildHistory(epoch: number, count = 110): DemoCandle[] {
  const rand = rng(11);
  const bars: DemoCandle[] = [];
  let close = START_MC * 0.62;
  const step = (START_MC - close) / count;
  for (let i = 0; i < count; i += 1) {
    const open = close;
    const trend = step * (0.6 + rand() * 0.9);
    const noise = (rand() - 0.48) * START_MC * 0.022;
    close = Math.max(1_000, open + trend + noise);
    const span = Math.abs(close - open);
    bars.push({
      time: epoch - (count - 1 - i) * CANDLE_SPAN_S,
      open,
      close,
      high: Math.max(open, close) + span * rand() * 0.6 + START_MC * 0.002 * rand(),
      low: Math.min(open, close) - span * rand() * 0.6 - START_MC * 0.002 * rand(),
    });
  }
  const last = bars[bars.length - 1]!;
  last.close = START_MC;
  last.high = Math.max(last.high, START_MC);
  last.low = Math.min(last.low, START_MC);
  return bars;
}

const WALLETS = [
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
  "F3kDq8mTn2uYb7LpRaVx5cHs4EwJ9Zt1GoNk6BdQu7Pa",
  "Bz8WcR1tYh3KmVd5LpQe7NxA2UfJ4Sg9TbXo6CwRz1tq",
  "7mVnEQ5xK2LpYd8RtBh4WcA3UfJ9SgZ6TbNo1CwXe5Qq",
  "Hq2Tn9YsK4LpVd7RaBh3WcE5UfJ8SgZ1TbXo6CwNm4Rz",
  "Dk6Aw3ZbK9LpYd2RtVh7WcE4UfJ5SgQ8TbNo1CxMn6Rz",
  "Lp4Cs8RjK7YdVh2WtBn9EaU3fJ6SgZ5TbXo1QcMw4Rz",
  "Yt1Gm6VdK3LpRa8BhWc5EnU9fJ2SgZ7TbXo4QcNw6Rz",
  "Cw5Rz2KpL8YdVh4WtBn7EaU1fJ3SgZ9TbXo6QcMm2Ap",
  "Nv3Xk7QpL2YdVh8WtBn5EaU4fJ1SgZ6TbXo9QcMz7Ef",
];

const SOL_SIZES = [0.1, 0.25, 0.5, 0.8, 1, 1.5, 2, 2.5, 3.2, 5];

export function makeTrade(
  id: number,
  t: number,
  mcUsd: number,
  rand: () => number,
): DemoTrade {
  const side = rand() < 0.57 ? "buy" : "sell";
  const sol = SOL_SIZES[Math.floor(rand() * SOL_SIZES.length)]!;
  const usd = sol * SOL_USD * (0.92 + rand() * 0.16);
  const price = mcUsd / DEMO_TOKEN.supply;
  return {
    id,
    t,
    side,
    mcUsd,
    usd,
    tokenAmount: usd / price,
    trader: WALLETS[Math.floor(rand() * WALLETS.length)]!,
  };
}

/** The tape the demo opens with, newest first, ending at demo time 0. */
export function seedTrades(count = 14): DemoTrade[] {
  const rand = rng(29);
  const out: DemoTrade[] = [];
  let t = -1;
  for (let i = 0; i < count; i += 1) {
    const mc = START_MC * (1 - i * 0.0016) * (0.997 + rand() * 0.006);
    out.push(makeTrade(-(i + 1), t, mc, rand));
    t -= 1 + Math.floor(rand() * 5);
  }
  return out;
}

// --- Formatters: the app's own rules (format-time.ts, format.ts, format-usd.ts).

export function formatAge(ageSecs: number): string {
  if (!Number.isFinite(ageSecs) || ageSecs < 0) return "0s";
  if (ageSecs < 60) return `${Math.floor(ageSecs)}s`;
  const mins = Math.floor(ageSecs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

function tiered(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}m`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(2)}k`;
  return n.toFixed(2);
}

export function compactCount(n: number): string {
  return tiered(n);
}

export function compactUsd(n: number): string {
  return n < 0 ? `-$${tiered(-n)}` : `$${tiered(n)}`;
}

/** Chart axis / legend: `42.1K`, `1.25M`. */
export function chartMc(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return `${(n / 1e3).toFixed(1)}K`;
}

const SUBSCRIPT = "₀₁₂₃₄₅₆₇₈₉";

/** `0.000042` → `$0.0₄42`, the terminal header's small-price format. */
export function subscriptPrice(price: number): string {
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  const s = price.toFixed(12).split(".")[1] ?? "";
  const zeros = s.match(/^0*/)?.[0].length ?? 0;
  const digits = s.slice(zeros, zeros + 2);
  const sub = String(zeros)
    .split("")
    .map((d) => SUBSCRIPT[Number(d)])
    .join("");
  return `$0.0${sub}${digits}`;
}

export function shortenMint(mint: string): string {
  return `${mint.slice(0, 4)}...${mint.slice(-4)}`;
}
