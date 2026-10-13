"use client";

import clsx from "clsx";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
} from "react";

import AboutToMigrateIcon from "./icons/about-to-migrate-icon";
import DevHoldingIcon from "./icons/dev-holding-icon";
import HolderConcentrationIcon from "./icons/holder-concentration-icon";
import HoldersIcon from "./icons/holders-icon";
import LiquidityIcon from "./icons/liquidity-icon";
import NewTokenIcon from "./icons/new-token-icon";
import SnipersHoldingIcon from "./icons/snipers-holding-icon";
import UfoIcon from "./icons/ufo-icon";
import VolumeIcon from "./icons/volume-icon";

/**
 * Display-only port of trenchers_fe's first-trade gate
 * (`ai-agent-first-trade-chrome`, `-progress-bar`, `-scan-feed`, `-success`
 * and the `bot-watching` lanes), driven by a scripted demo feed.
 */

const BOT_NAME = "V-01_SNIPER";
const SEGMENT_COUNT = 88;
/** Failing-gate count at or under which a candidate promotes to Near entry. */
const NEAR_ENTRY_MAX_GATES_LEFT = 2;
const MAX_LANE_ROWS = 3;

type Gate = {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const GATES: Gate[] = [
  { label: "Holders", Icon: HoldersIcon },
  { label: "Liquidity", Icon: LiquidityIcon },
  { label: "Volume", Icon: VolumeIcon },
  { label: "Dev holdings", Icon: DevHoldingIcon },
  { label: "Snipers", Icon: SnipersHoldingIcon },
  { label: "Top 10 holders", Icon: HolderConcentrationIcon },
];

type DemoToken = {
  mint: string;
  symbol: string;
  name: string;
  from: string;
  to: string;
  mc: string;
  vol: string;
  bcPct: number;
  /** First gate this token is checked against — staggers which gates fail. */
  gateOffset: number;
};

const TOKENS: Record<string, DemoToken> = {
  GRUMP: {
    mint: "GRUMP",
    symbol: "GRUMP",
    name: "Grumpy Cat",
    from: "#FF9A4D",
    to: "#B4381C",
    mc: "$6.1K",
    vol: "$1.4K",
    bcPct: 18,
    gateOffset: 3,
  },
  WAGMI: {
    mint: "WAGMI",
    symbol: "WAGMI",
    name: "We All Gonna",
    from: "#7DD3FC",
    to: "#2563EB",
    mc: "$11.8K",
    vol: "$4.2K",
    bcPct: 34,
    gateOffset: 4,
  },
  FROG: {
    mint: "FROG",
    symbol: "FROG",
    name: "Pond Frog",
    from: "#86EFAC",
    to: "#15803D",
    mc: "$24.6K",
    vol: "$9.8K",
    bcPct: 57,
    gateOffset: 0,
  },
  SOLCAT: {
    mint: "SOLCAT",
    symbol: "SOLCAT",
    name: "Sol Cat",
    from: "#F0ABFC",
    to: "#9333EA",
    mc: "$8.3K",
    vol: "$2.7K",
    bcPct: 22,
    gateOffset: 2,
  },
  DEGEN: {
    mint: "DEGEN",
    symbol: "DEGEN",
    name: "Degen Hours",
    from: "#FDE68A",
    to: "#CA8A04",
    mc: "$3.9K",
    vol: "$0.8K",
    bcPct: 9,
    gateOffset: 1,
  },
};

const TRADED_MINT = "FROG";

type Frame = {
  ms: number;
  /** Candidates in birth order, with gates passed (null = not evaluated yet). */
  feed: [mint: string, passed: number | null][];
  bought?: boolean;
  success?: boolean;
};

const FRAMES: Frame[] = [
  { ms: 1000, feed: [] },
  { ms: 900, feed: [["GRUMP", null]] },
  {
    ms: 900,
    feed: [
      ["GRUMP", 2],
      ["WAGMI", null],
    ],
  },
  {
    ms: 900,
    feed: [
      ["GRUMP", 3],
      ["WAGMI", 2],
      ["FROG", null],
    ],
  },
  {
    ms: 1000,
    feed: [
      ["GRUMP", 3],
      ["WAGMI", 3],
      ["FROG", 3],
      ["SOLCAT", null],
    ],
  },
  {
    ms: 1200,
    feed: [
      ["GRUMP", 2],
      ["WAGMI", 4],
      ["FROG", 4],
      ["SOLCAT", 2],
    ],
  },
  {
    ms: 1200,
    feed: [
      ["GRUMP", 2],
      ["WAGMI", 4],
      ["FROG", 5],
      ["SOLCAT", 3],
      ["DEGEN", null],
    ],
  },
  {
    ms: 1400,
    feed: [
      ["WAGMI", 4],
      ["FROG", 6],
      ["SOLCAT", 3],
      ["DEGEN", 1],
    ],
  },
  {
    ms: 2200,
    bought: true,
    feed: [
      ["WAGMI", 4],
      ["FROG", 6],
      ["SOLCAT", 3],
      ["DEGEN", 1],
    ],
  },
  {
    ms: 3000,
    bought: true,
    success: true,
    feed: [
      ["WAGMI", 4],
      ["FROG", 6],
      ["SOLCAT", 3],
      ["DEGEN", 1],
    ],
  },
];

/** Shown when reduced motion is on: the token is bought, no loop. */
const STATIC_FRAME = 8;

type LaneEntry = {
  token: DemoToken;
  evaluated: boolean;
  passed: number;
  gatesLeft: number;
  nearEntry: boolean;
  bornFrame: number;
  ageSecs: number;
};

type Phase = "scanning" | "evaluating" | "ready" | "executed";

const PHASE_LABEL: Record<Exclude<Phase, "executed">, string> = {
  scanning: "Scanning new launches",
  evaluating: "Evaluating candidates",
  ready: "Setup found — ready to enter",
};

function bornFrameOf(mint: string): number {
  return FRAMES.findIndex((f) => f.feed.some(([m]) => m === mint));
}

function entriesFor(frameIndex: number): LaneEntry[] {
  return FRAMES[frameIndex].feed.map(([mint, passed]) => {
    const token = TOKENS[mint];
    const bornFrame = bornFrameOf(mint);
    const evaluated = passed != null;
    const gatesLeft = evaluated ? GATES.length - passed : GATES.length;
    return {
      token,
      evaluated,
      passed: passed ?? 0,
      gatesLeft,
      nearEntry: evaluated && gatesLeft <= NEAR_ENTRY_MAX_GATES_LEFT,
      bornFrame,
      ageSecs: 2 + (frameIndex - bornFrame) * 3,
    };
  });
}

function computeProgress(entries: LaneEntry[]): number {
  if (entries.length === 0) return 0.06;
  let best = 0.06;
  for (const e of entries) {
    if (!e.evaluated) {
      best = Math.max(best, 0.1);
      continue;
    }
    let ratio = e.passed / GATES.length;
    if (e.nearEntry) ratio += 0.08;
    if (e.gatesLeft === 0) ratio = 0.94;
    best = Math.max(best, ratio);
  }
  return Math.min(0.94, Math.max(0.06, best));
}

function computePhase(entries: LaneEntry[], progress: number): Phase {
  if (entries.length === 0) return "scanning";
  if (progress >= 0.9 || entries.some((e) => e.evaluated && e.gatesLeft === 0))
    return "ready";
  if (progress > 0.12 || entries.some((e) => e.evaluated)) return "evaluating";
  return "scanning";
}

function failingGate(entry: LaneEntry): Gate {
  return GATES[(entry.token.gateOffset + entry.passed) % GATES.length];
}

function gatePasses(entry: LaneEntry, gateIndex: number): boolean {
  const rel = (gateIndex - entry.token.gateOffset + GATES.length) % GATES.length;
  return entry.evaluated && rel < entry.passed;
}

function activityCaption(
  active: LaneEntry | null,
  total: number,
  bought: boolean,
): string {
  if (bought) return `${TOKENS[TRADED_MINT].symbol} — bought, first trade done`;
  if (!active) {
    return total > 0
      ? `Evaluating ${total} candidate${total === 1 ? "" : "s"}…`
      : "Scanning new launches for your setup…";
  }
  const sym = active.token.symbol;
  if (active.nearEntry && active.gatesLeft === 0) {
    return `${sym} — all gates passed, ready to enter`;
  }
  if (!active.evaluated) return `${sym} — just spotted, checking gates`;
  return `${sym} — checking ${failingGate(active).label.toLowerCase()}`;
}

function formatAge(secs: number): string {
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m`;
}

/** Per-mint motion vars so each token's status bar sways at a different pace. */
function statusBarMotionVars(mint: string): CSSProperties {
  let h = 0;
  for (let i = 0; i < mint.length; i++) {
    h = (Math.imul(31, h) + mint.charCodeAt(i)) >>> 0;
  }
  return {
    "--watch-gate-motion-duration": `${(2.3 + (h % 11) * 0.17).toFixed(2)}s`,
    "--watch-gate-motion-delay": `${(((h >>> 7) % 18) * 0.055).toFixed(3)}s`,
    "--watch-gate-sway-scale": (1.02 + (h % 6) * 0.012).toFixed(3),
  } as CSSProperties;
}

function FirstTradeProgressBar({
  progress,
  phase,
}: {
  progress: number;
  phase: Phase;
}) {
  const clamped = Math.min(1, Math.max(0, progress));
  const filledCount = Math.round(clamped * SEGMENT_COUNT);
  const markerIndex =
    filledCount > 0 ? Math.min(filledCount, SEGMENT_COUNT - 1) : -1;

  return (
    <div
      className={clsx(
        "ai-first-trade-progress mt-4 w-full",
        `ai-first-trade-progress--${phase}`,
      )}
    >
      <div className="ai-first-trade-progress__track" aria-hidden>
        {Array.from({ length: SEGMENT_COUNT }, (_, i) => (
          <span
            key={i}
            style={{ "--segment-i": i } as CSSProperties}
            className={clsx(
              "ai-first-trade-progress__segment",
              i < filledCount && "ai-first-trade-progress__segment--filled",
              i === markerIndex && "ai-first-trade-progress__segment--marker",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function FirstTradeChrome({
  progress,
  phase,
}: {
  progress: number;
  phase: Phase;
}) {
  const pct = Math.round(progress * 100);
  const statusLabel =
    phase === "executed"
      ? `Token bought — ${TOKENS[TRADED_MINT].symbol}`
      : PHASE_LABEL[phase];

  return (
    <div className="shrink-0 border-b border-white/6 pb-4">
      <div className="flex w-full items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center" aria-hidden>
          <UfoIcon className="size-8" />
        </div>
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white/95">
          {BOT_NAME}
        </p>
        <div className="flex shrink-0 items-baseline gap-3">
          <span className="hidden text-[14px] text-white/55 sm:inline">
            {statusLabel}
          </span>
          <span className="w-[3.25rem] text-right text-2xl font-semibold tabular-nums text-white/90">
            {pct}%
          </span>
        </div>
      </div>
      <FirstTradeProgressBar progress={progress} phase={phase} />
    </div>
  );
}

function FirstTradeScanCaption({
  caption,
  total,
}: {
  caption: string;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2 py-3">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#2FE0A4]/40 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-[#2FE0A4]" />
      </span>
      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/70">
        {caption}
      </p>
      {total > 0 ? (
        <span className="shrink-0 rounded-md bg-white/6 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white/45">
          {total} live
        </span>
      ) : null}
    </div>
  );
}

function TokenAvatar({ token }: { token: DemoToken }) {
  return (
    <span
      className="grid size-10 shrink-0 place-items-center rounded-full p-[2px]"
      style={{
        background: `conic-gradient(#12af80 ${token.bcPct}%, rgb(255 255 255 / 0.08) 0)`,
      }}
      aria-hidden
    >
      <span
        className="grid size-full place-items-center rounded-full text-[13px] font-bold text-white/95 [text-shadow:0_1px_0_rgb(0_0_0_/_0.35)]"
        style={{
          background: `linear-gradient(140deg, ${token.from}, ${token.to})`,
        }}
      >
        {token.symbol.slice(0, 1)}
      </span>
    </span>
  );
}

function WatchGateIconPill({ entry }: { entry: LaneEntry }) {
  const passPct = entry.evaluated ? (entry.passed / GATES.length) * 100 : 0;

  return (
    <div
      className="watch-gate-icon-pill"
      style={
        {
          ...statusBarMotionVars(entry.token.mint),
          "--watch-gate-pass-pct": passPct,
        } as CSSProperties
      }
    >
      <div
        className="watch-gate-icon-pill__fill watch-gate-icon-pill__fill--track"
        aria-hidden
      />
      <div
        className="watch-gate-icon-pill__fill watch-gate-icon-pill__fill--progress"
        aria-hidden
      />
      <div className="watch-gate-icon-pill__content">
        <div className="flex shrink-0 items-center gap-1">
          {GATES.map((gate, i) => (
            <div
              key={gate.label}
              title={gate.label}
              className={clsx(
                "grid size-6 shrink-0 place-items-center rounded-full",
                gatePasses(entry, i)
                  ? "watch-gate-icon--active"
                  : "watch-gate-icon--idle",
              )}
            >
              <gate.Icon className="size-3.5 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WatchTokenRow({
  entry,
  celebrating,
}: {
  entry: LaneEntry;
  celebrating: boolean;
}) {
  const { token } = entry;
  const flash = entry.evaluated && entry.gatesLeft === 0;

  return (
    <motion.div
      layout="position"
      layoutId={`first-trade-${token.mint}`}
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      className={clsx("watch-token-row", flash && "watch-token-row--flash")}
    >
      <div
        className={clsx(
          "watch-token-row__header flex w-full min-w-0 items-center gap-3 px-3 py-3",
          flash && "watch-token-row__header--flash",
        )}
      >
        <TokenAvatar token={token} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-sm font-semibold tracking-tight text-white">
              {token.symbol}
            </span>
            <span className="truncate text-xs text-white/40">{token.name}</span>
          </div>
          <div className="flex min-w-0 items-center gap-x-3 text-xs">
            <span className="text-[13px] font-medium text-[#12af80]">
              {formatAge(entry.ageSecs)}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
              <span className="text-[#545454]">MC</span>
              <span className="tabular-nums text-white/90">{token.mc}</span>
            </span>
            <span className="hidden shrink-0 items-center gap-1 whitespace-nowrap min-[380px]:inline-flex">
              <span className="text-[#545454]">V</span>
              <span className="tabular-nums text-white/90">{token.vol}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex min-w-0 items-center px-1.5 pb-0.5">
          <WatchGateIconPill entry={entry} />
        </div>

        <motion.div
          initial={false}
          animate={{
            height: celebrating ? 62 : 0,
            opacity: celebrating ? 1 : 0,
          }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="pt-2.5">
            <div className="watch-token-row__celebration-panel">
              <span className="watch-token-row__celebration-icon" aria-hidden>
                <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
                  <path
                    d="M4 8.25 6.75 11 12 5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
                <span className="watch-token-row__celebration-kicker">
                  Token bought
                </span>
                <span className="text-xs text-white/22" aria-hidden>
                  —
                </span>
                <span className="watch-token-row__celebration-symbol">
                  {token.symbol}
                </span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function WatchColumn({
  icon,
  title,
  meta,
  entries,
  emptyText,
  bought,
  className,
}: {
  icon: ReactNode;
  title: string;
  meta: string;
  entries: LaneEntry[];
  emptyText: string;
  bought: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "ui-surface-tour-card flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg",
        className,
      )}
    >
      <div className="flex h-11 w-full min-w-0 shrink-0 items-center gap-2 border-b border-black px-3">
        <div className="relative size-4 shrink-0 text-white">{icon}</div>
        <span className="shrink-0 text-[14px] font-medium text-white">
          {title}
        </span>
        <div className="min-w-0 flex-1" aria-hidden />
        <span className="min-w-0 truncate text-xs text-[#646464]">{meta}</span>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden [mask-image:linear-gradient(to_bottom,black_78%,transparent)]">
        <AnimatePresence initial={false}>
          {entries.length === 0 ? (
            <motion.div
              key="empty"
              className="watch-column-empty absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              {emptyText}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="flex flex-col gap-2.5 px-2 py-2.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {entries.slice(0, MAX_LANE_ROWS).map((e) => (
              <WatchTokenRow
                key={e.token.mint}
                entry={e}
                celebrating={bought && e.token.mint === TRADED_MINT}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const PARTICLE_COUNT = 8;

function FirstTradeSuccess() {
  return (
    <motion.div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden rounded-xl bg-[#0b0b0b]/92 px-6 text-center backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="ai-first-trade-success__glow" aria-hidden />
      <div className="ai-first-trade-success__icon-stage" aria-hidden>
        <span className="ai-first-trade-success__ripple" />
        <span className="ai-first-trade-success__ripple ai-first-trade-success__ripple--delayed" />
        {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
          <span
            key={i}
            className="ai-first-trade-success__particle"
            style={
              {
                "--particle-i": i,
                "--particle-angle": `${(360 / PARTICLE_COUNT) * i}deg`,
              } as CSSProperties
            }
          />
        ))}
        <span className="ai-first-trade-success__icon">
          <svg viewBox="0 0 24 24" fill="none" className="size-8">
            <path
              className="ai-first-trade-success__check"
              d="M6 12.5 10 16.5 18 8"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      <h3 className="ai-first-trade-success__title relative mt-6 text-2xl font-semibold tracking-tight text-white/95 sm:text-3xl">
        First trade executed
      </h3>
      <p className="ai-first-trade-success__copy relative mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/45">
        Your agent placed its first simulation trade.
      </p>
    </motion.div>
  );
}

export function FirstTradePreview({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduceMotion = useReducedMotion();
  const animate = inView && !reduceMotion;
  const [step, setStep] = useState(0);
  const [loop, setLoop] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const id = window.setTimeout(() => {
      if (step === FRAMES.length - 1) setLoop((l) => l + 1);
      setStep((s) => (s + 1) % FRAMES.length);
    }, FRAMES[step].ms);
    return () => window.clearTimeout(id);
  }, [animate, step]);

  const frameIndex = reduceMotion ? STATIC_FRAME : step;
  const frame = FRAMES[frameIndex];
  const entries = entriesFor(frameIndex);
  const bought = frame.bought === true;

  const nearLane = entries
    .filter((e) => e.nearEntry)
    .sort((a, b) => a.gatesLeft - b.gatesLeft);
  const spottedLane = entries
    .filter((e) => !e.nearEntry)
    .sort((a, b) => b.bornFrame - a.bornFrame);
  const showNear = nearLane.length > 0;

  const progress = bought ? 1 : computeProgress(entries);
  const phase: Phase = bought ? "executed" : computePhase(entries, progress);
  const caption = activityCaption(
    nearLane[0] ?? spottedLane[0] ?? null,
    entries.length,
    bought,
  );

  return (
    <div
      ref={ref}
      aria-hidden
      className={clsx(
        "pointer-events-none relative flex w-full select-none flex-col",
        className,
      )}
    >
      <FirstTradeChrome progress={progress} phase={phase} />
      <FirstTradeScanCaption caption={caption} total={entries.length} />

      <LayoutGroup id="first-trade-lanes">
        <div className="grid h-[340px] min-h-0 grid-cols-1 gap-3 sm:h-[360px] sm:grid-cols-2">
          <WatchColumn
            icon={<NewTokenIcon className="size-full" />}
            title="Just spotted"
            meta={`${spottedLane.length} · newest`}
            entries={spottedLane}
            emptyText={
              entries.length === 0
                ? "Scanning new launches…"
                : "Every candidate is near entry"
            }
            bought={bought}
            className={showNear ? "hidden sm:flex" : undefined}
          />
          <WatchColumn
            icon={<AboutToMigrateIcon className="size-full" />}
            title="Near entry"
            meta={`${nearLane.length} · fewest gates left`}
            entries={nearLane}
            emptyText="None near entry yet"
            bought={bought}
            className={showNear ? undefined : "hidden sm:flex"}
          />
        </div>
      </LayoutGroup>

      <AnimatePresence>
        {frame.success ? <FirstTradeSuccess key={loop} /> : null}
      </AnimatePresence>
    </div>
  );
}
