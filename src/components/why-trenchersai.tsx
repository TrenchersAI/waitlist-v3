"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Activity, Check, Plus, SlidersHorizontal, Wallet } from "lucide-react";
import flowStyles from "./how-it-works.module.css";

/** Shared scroll-reveal preset used by every section block below. Lower
   threshold + bottom margin so each section fades in just before it enters
   the viewport. Keeps the page feeling continuous instead of "wait,
   then pop". */
const reveal = {
  initial: { opacity: 0, y: 18 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: {
    once: true,
    amount: 0.18,
    margin: "0px 0px 12% 0px",
  } as const,
  transition: { duration: 0.5, ease: "easeOut" as const },
};

// Matches the Fleet → spawn dialog → dashboard flow in trenchers_fe.
const HOW_IT_WORKS_STEPS = [
  {
    id: "spawn",
    title: "Create your agent",
    description:
      "Open Fleet, choose Paper or Live, then select Spawn agent. Give your agent a name to begin.",
  },
  {
    id: "configure",
    title: "Set the trading rules",
    description:
      "Choose your trade size, entry conditions, holder limits, take-profit levels, and stop-loss rules.",
  },
  {
    id: "fund",
    title: "Fund your agent",
    description:
      "Select Add balance to give your agent simulated funds in Paper, or fund its live wallet with real SOL.",
  },
  {
    id: "monitor",
    title: "Start and monitor",
    description:
      "Start your agent, track its positions and activity, and pause or adjust its trading rules as needed.",
  },
] as const;

type FlowStepId = (typeof HOW_IT_WORKS_STEPS)[number]["id"];

/** Decorative UI illustrations; the complete instructions sit below them. */
function FlowStepPreview({ step }: { step: FlowStepId }) {
  return (
    <div aria-hidden="true" className={flowStyles.preview}>
      {step === "spawn" && (
        <div className="w-full rounded-xl border border-white/10 bg-[#080d1d] p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-white/80">Fleet</span>
            <span className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#010513]">
              <Plus size={12} /> Spawn agent
            </span>
          </div>
          <div className="mt-5 inline-flex gap-1 rounded-md border border-white/8 p-1 text-[10px]">
            <span className="rounded bg-[#8c95ff]/15 px-3 py-1 text-[#c5cbff]">Paper</span>
            <span className="px-3 py-1 text-white/50">Live</span>
          </div>
          <div className="mt-4 border-t border-white/8 pt-3">
            <span className="text-[10px] text-white/50">Agent name</span>
            <div className="mt-1.5 flex items-center gap-1 text-xs text-white/85">
              My agent<span className="h-3 w-px bg-[#aeb7ff]" />
            </div>
          </div>
        </div>
      )}
      {step === "configure" && (
        <div className="w-full rounded-xl border border-white/10 bg-[#080d1d] p-4 shadow-lg">
          <div className="mb-4 flex items-center gap-2 text-xs font-medium text-white/80">
            <SlidersHorizontal size={14} className="text-[#b5bdff]" /> Your strategy
          </div>
          <div className="space-y-3.5">
            {[
              { label: "Per-trade size", width: "38%" },
              { label: "Entry filters", width: "64%" },
              { label: "Take-profit & stops", width: "48%" },
            ].map((setting) => (
              <div key={setting.label}>
                <div className="mb-2 text-[10px] text-white/60">{setting.label}</div>
                <div className="h-1 rounded-full bg-white/8">
                  <div className="relative h-full rounded-full bg-[#aeb7ff]/65" style={{ width: setting.width }}>
                    <span className="absolute -top-0.5 right-0 size-2 rounded-full bg-[#d0d5ff]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {step === "fund" && (
        <div className="w-full rounded-xl border border-white/10 bg-[#080d1d] p-4 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-medium text-white/80">
            <Wallet size={14} className="shrink-0 text-[#b5bdff]" /> Agent balance
          </div>
          <div className="mt-4 rounded-lg border border-white/8 bg-white/3 p-3">
            <div className="text-[10px] text-white/50">Amount</div>
            <div className="mt-2 flex items-center justify-between text-white/85">
              <span className="text-lg">—</span>
              <span className="text-[11px]">SOL</span>
            </div>
          </div>
          <div className="mt-3 rounded-md bg-[#c5cbff] px-3 py-2 text-center text-[10px] font-medium text-[#010513]">
            Add balance
          </div>
        </div>
      )}
      {step === "monitor" && (
        <div className="w-full rounded-xl border border-white/10 bg-[#080d1d] p-4 shadow-lg">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-white/80">
            <span className="flex items-center gap-2"><Activity size={14} className="text-[#b5bdff]" /> Dashboard</span>
            <span className="rounded-full bg-[#8c95ff]/15 px-2 py-1 text-[9px] text-[#c5cbff]">Paper</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 border-b border-white/8 pb-2 text-[10px]">
            <span className="text-white/85">Watch Feed</span>
            <span className="text-white/45">Positions</span>
            <span className="text-white/45">Activity</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-white/70">
            <span className="size-1.5 rounded-full bg-[#aeb7ff]" /> Watching tokens
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-white/50">
            <Check size={12} className="text-[#b5bdff]" /> Checking your entry rules
          </div>
        </div>
      )}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-white/45 uppercase">
      <span aria-hidden className="h-px w-6 bg-white/15" />
      {children}
    </span>
  );
}

const ADV_CARD_ICON_CLASS =
  "size-5 shrink-0 stroke-[1.5] text-white/88 [&_circle]:stroke-[1.5]";

function IconProStack() {
  return (
    <svg
      className={ADV_CARD_ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
    </svg>
  );
}

function IconFragmentedUi() {
  return (
    <svg
      className={ADV_CARD_ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="11" width="7" height="10" rx="1" />
      <rect x="3" y="15" width="7" height="6" rx="1" />
    </svg>
  );
}

function IconOnboardingGap() {
  return (
    <svg
      className={ADV_CARD_ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

const ADVANCED_TRADING_CARDS = [
  {
    title: "Automation and infra",
    lines: [
      "The best traders have automation, fast execution, private infra, and custom bots, all wired together.",
    ],
    icon: <IconProStack />,
  },
  {
    title: "Fragmented workflows",
    lines: [
      "Most trenchers juggle tabs, wallet popups, Telegram commands, messy dashboards, and a brutal learning curve.",
    ],
    icon: <IconFragmentedUi />,
  },
  {
    title: "The truth",
    lines: [
      "The edge is there. The hard part is reaching it while the window is still open. The onboarding is broken.",
    ],
    icon: <IconOnboardingGap />,
  },
] as const;

/* ----------------------------------------------------------------------- */
/* Section 1: Problem                                                       */
/* ----------------------------------------------------------------------- */

export function ProblemSection() {
  return (
    <section className="site-canvas-bg relative w-full border-t border-white/6">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:px-8 md:py-28">
        <motion.div
          className="terminal-panel-bg flex flex-col gap-10 rounded-2xl border border-white/8 px-6 py-8 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.75)] md:gap-12 md:px-8 md:py-10 lg:flex-row lg:items-stretch lg:gap-0 lg:px-10 lg:py-11"
          {...reveal}
        >
          <div className="flex min-w-0 flex-1 flex-col items-start gap-5 text-left md:gap-6 lg:pr-10">
            <h2 className="text-balance text-[26px] font-medium leading-[1.08] tracking-[-0.02em] text-white sm:text-[32px] md:text-[36px] lg:text-[40px]">
              The trenches are already automated
            </h2>
            <p className="max-w-[800px] text-balance text-[14px] leading-[1.72] text-white/55 md:text-[16px]">
              You are not just competing with other traders anymore. You are
              competing with bots, private infra, faster execution, and wallets
              that react before CT even notices.Advanced trading is still too
              hard to use
            </p>
          </div>

          <div
            aria-hidden
            className="hidden w-px shrink-0 bg-white/10 lg:block"
          />

          <div className="flex shrink-0 flex-col justify-center border-t border-white/10 pt-8 lg:w-[min(220px,28%)] lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <p className="text-[40px] font-semibold leading-none tracking-[-0.03em] text-white sm:text-[48px] md:text-[52px]">
              <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
                <span>{"<"}</span>
                <span>1</span>
                <span className="text-[16px] font-medium tracking-normal text-white/38">
                  block
                </span>
              </span>
            </p>
            <p className="mt-3 max-w-[16ch] text-[13px] leading-snug text-white/55 md:text-[14px]">
              Built for speed when milliseconds matter.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="mt-10 flex flex-col gap-10 md:mt-12 md:gap-12"
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.06 }}
        >
          <div className="flex flex-col gap-6">
            <div>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {ADVANCED_TRADING_CARDS.map((card) => (
                  <div
                    key={card.title}
                    className="flex min-h-full min-w-0 flex-col gap-4 px-6 py-7 md:gap-5 md:px-7 md:py-8"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/4">
                      {card.icon}
                    </div>
                    <h4 className="text-[17px] font-medium leading-snug tracking-[-0.01em] text-white md:text-[18px]">
                      {card.title}
                    </h4>
                    <div className="flex flex-col gap-3 text-[14px] leading-[1.6] text-white/55 md:text-[15px]">
                      {card.lines.map((line, i) => (
                        <p key={`${card.title}-${i}`} className="text-pretty">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <motion.p
              className="mt-4 max-w-[62ch] text-balance text-[16px] italic leading-[1.45] tracking-[-0.01em] text-white/70 md:mt-15 md:text-[44px] text-center"
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.1 }}
            >
              {"\u201C"}TrenchersAI makes pro-level trading tools feel simple.
              {"\u201D"}
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------- */
/* Section 2: How it works                                                 */
/* ----------------------------------------------------------------------- */

export function SolutionSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="site-canvas-bg relative w-full border-t border-white/6">
      <div className="mx-auto w-full max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <motion.div
          className="mb-9 flex flex-col items-start gap-5 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-10"
          {...reveal}
        >
          <div className="flex min-w-0 flex-col items-start gap-4 text-left">
            <Eyebrow>How it works</Eyebrow>
            <h2 id="how-it-works-heading" className="text-balance text-[32px] font-medium leading-[1.08] tracking-[-0.03em] text-white sm:text-[38px] md:text-[44px]">
              Your agent. Your rules.
            </h2>
          </div>
          <p className="max-w-[43ch] text-balance text-[14px] leading-[1.72] text-white/55 md:text-[16px]">
            Create an agent, set its rules, add a balance, and follow its
            activity in Paper or Live.
          </p>
        </motion.div>

        <ol className={flowStyles.grid}>
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <motion.li
              key={step.id}
              data-step={step.id}
              className={flowStyles.card}
              {...reveal}
              transition={{ ...reveal.transition, delay: index * 0.04 }}
            >
              <FlowStepPreview step={step.id} />
              <div className={flowStyles.content}>
                <div className={flowStyles.captionHeading}>
                  <span aria-hidden="true" className={flowStyles.number}>0{index + 1}</span>
                  <h3 className={flowStyles.title}>{step.title}</h3>
                </div>
                <p className={flowStyles.description}>{step.description}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------- */
/* Section 3: Product preview                                               */
/* ----------------------------------------------------------------------- */

export function PreviewSection() {
  return (
    <section className="site-canvas-bg relative w-full border-t border-white/6">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:px-8 md:py-28">
        <motion.div
          className="relative flex flex-col gap-6 overflow-hidden rounded-[24px] bg-[linear-gradient(160deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.05)_58%,rgba(140,149,255,0.1)_100%)] px-6 py-8 text-left shadow-[0_18px_50px_-35px_rgba(0,0,0,0.7)] md:px-8 md:py-9 lg:px-9"
          {...reveal}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#8C95FF]/12 blur-3xl"
          />
          <div className="-mx-6 -mt-8 mb-1 flex items-center justify-between bg-black/10 px-6 py-3 md:-mx-8 md:-mt-9 md:px-8 lg:-mx-9 lg:px-9">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            </div>
            <span className="text-[10.5px] font-semibold tracking-[0.18em] text-white/45 uppercase">
              Inside the terminal
            </span>
            <span aria-hidden className="h-2.5 w-10" />
          </div>
          <h2 className="max-w-[18ch] text-balance text-[32px] font-medium leading-[1.08] tracking-tight text-white md:text-[44px]">
            The pro terminal traders know.
          </h2>
          <h3 className="text-balance text-[24px] font-medium leading-[1.12] tracking-tight text-[#C5CBFF] md:text-[32px]">
            But with AI.
          </h3>

          <div className="mt-1 flex max-w-[64ch] flex-col gap-4 text-[15px] leading-[1.72] text-white/72 md:text-[17px]">
            <p>
              TrenchersAI brings the tools traders already use across the
              trenches into one terminal: sniping, copy trading, whale tracking,
              charts, watchlists, position management, and fast execution.
            </p>
            <p>
              Then it adds the missing layer: AI agents that help configure and
              run bots without turning the product into a black box.
            </p>
          </div>

          <div className="mt-1 flex flex-col gap-2 rounded-xl bg-white/4 p-4 text-[15px] font-medium leading-[1.55] text-white/92 md:p-5 md:text-[17px]">
            <p className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 rounded-full bg-white/65"
              />
              <span>Manual when you want control</span>
            </p>
            <p className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 rounded-full bg-white/65"
              />
              <span>AI-assisted when you want speed.</span>
            </p>
            <p className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 rounded-full bg-white/65"
              />
              <span>
                Delegated when you want the agent to handle the setup.
              </span>
            </p>
          </div>
        </motion.div>

        <motion.div
          className="group relative mt-8 overflow-hidden rounded-[24px] bg-[#141414] p-3 sm:p-4 md:mt-10"
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.05 }}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0" />
          <div className="relative overflow-hidden rounded-[18px] bg-black/35 p-2 sm:p-3">
            <div className="relative aspect-21/9 w-full min-w-0 overflow-hidden rounded-xl bg-black/35 ring-1 ring-inset ring-white/6">
              <Image
                src="/image.png"
                alt="TrenchersAI terminal preview"
                width={1854}
                height={925}
                sizes="(min-width: 1280px) 1100px, 100vw"
                unoptimized
                className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-linear-to-t from-[#0D0D0D] to-transparent"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
