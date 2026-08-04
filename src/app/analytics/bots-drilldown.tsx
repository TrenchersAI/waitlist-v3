"use client";

// =============================================================================
// bots-drilldown - user -> their bots -> one bot's full story
// =============================================================================
//
// Two levels, one component, because they share a breadcrumb and a back stack:
//
//   level 1  every bot this user spawned, live and paper
//   level 2  one bot: config, balances, open positions, every trade
//
// The balance shown is the SAME expression the terminal shows the customer
// (see `trenchers-bot-detail.ts`). Where a number could be read as real money
// but is not, it is labelled: paper bots carry a PAPER pill everywhere, and the
// free/allocated split is spelled out rather than collapsed into one figure.

import { useEffect, useState } from "react";
import { ArrowLeft, Bot as BotIcon, ChevronRight, ExternalLink } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import {
  PageSizeSelect,
  Pager,
  usePagination,
  usePagerAnchor,
} from "@/src/app/analytics/analytics-pagination";
import type {
  BotDetailPayload,
  UserBotsPayload,
} from "@/src/lib/trenchers-bot-detail";
import { cn } from "@/src/lib/utils";

function fmtSol(n: number): string {
  const a = Math.abs(n);
  if (a >= 100_000) return `${(n / 1000).toFixed(0)}k`;
  if (a >= 1000) return Math.round(n).toLocaleString("en-US");
  if (a >= 1) return n.toFixed(3);
  if (a === 0) return "0";
  return n.toFixed(a < 0.001 ? 6 : 4);
}
function fmtSigned(n: number): string {
  return `${n > 0 ? "+" : ""}${fmtSol(n)}`;
}
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
function fmtWhen(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const mins = Math.floor((Date.now() - then) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function shortAddr(a: string | null, n = 4): string {
  if (!a) return "-";
  return a.length <= n * 2 + 2 ? a : `${a.slice(0, n)}…${a.slice(-n)}`;
}

const STATE_TONE: Record<string, string> = {
  active: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  funded: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  paused: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  draft: "text-white/50 border-white/15 bg-white/[0.04]",
  drained: "text-red-400 border-red-400/30 bg-red-400/10",
  archived: "text-white/40 border-white/10 bg-white/[0.03]",
};

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        className ?? "border-white/15 bg-white/[0.04] text-white/60",
      )}
    >
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "plain",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "plain" | "good" | "bad" | "warn";
}) {
  return (
    <Card>
      <CardContent className="p-3.5">
        <p className="text-[10px] uppercase tracking-wider text-white/40">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-xl font-semibold tabular-nums",
            tone === "good"
              ? "text-emerald-400"
              : tone === "bad"
                ? "text-red-400"
                : tone === "warn"
                  ? "text-amber-400"
                  : "text-white",
          )}
        >
          {value}
        </p>
        {sub ? <p className="mt-0.5 text-[11px] text-white/40">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------

export function BotsDrilldown({
  userId,
  label,
  onBack,
}: {
  userId: string;
  label: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<UserBotsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [botId, setBotId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/analytics/bots/user/${userId}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as UserBotsPayload;
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const crumbName = data?.user?.email ?? data?.user?.name ?? label;

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-white/45">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          <ArrowLeft className="size-3.5" />
          All users
        </button>
        <ChevronRight className="size-3 text-white/25" />
        <button
          type="button"
          onClick={() => setBotId(null)}
          className={cn(
            "rounded-md px-1.5 py-1 transition-colors hover:bg-white/[0.05] hover:text-white",
            botId ? "" : "text-white",
          )}
        >
          {crumbName}
        </button>
        {botId ? (
          <>
            <ChevronRight className="size-3 text-white/25" />
            <span className="px-1.5 py-1 text-white">
              {data?.bots.find((b) => b.botId === botId)?.name ?? "Bot"}
            </span>
          </>
        ) : null}
      </nav>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Bots for this user</CardTitle>
            <CardDescription className="text-red-400/80">
              Could not load: {error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : !data ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : botId ? (
        <BotDetail botId={botId} />
      ) : (
        <UserBots data={data} onPick={setBotId} />
      )}
    </div>
  );
}

// --- level 1 -----------------------------------------------------------------

function UserBots({
  data,
  onPick,
}: {
  data: UserBotsPayload;
  onPick: (botId: string) => void;
}) {
  const live = data.bots.filter((b) => !b.paperMode);
  const paper = data.bots.filter((b) => b.paperMode);
  const totalFree = live.reduce((s, b) => s + b.freeSol, 0);
  const totalPnl = live.reduce((s, b) => s + b.realizedPnlSol, 0);
  const totalFills = live.reduce((s, b) => s + b.fills, 0);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{data.user?.name ?? data.user?.email ?? "User"}</CardTitle>
            {data.user?.liveTradingEnabled ? (
              <Pill className="border-emerald-400/30 bg-emerald-400/10 text-emerald-400">
                live enabled
              </Pill>
            ) : (
              <Pill>live disabled</Pill>
            )}
            {data.user?.isOnboarded ? null : <Pill>not onboarded</Pill>}
          </div>
          <CardDescription>
            {data.user?.email ?? "no email"} · wallet{" "}
            <span className="font-mono">
              {shortAddr(data.user?.walletAddress ?? null)}
            </span>{" "}
            · joined {fmtWhen(data.user?.joinedAt ?? null)}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Live bots"
          value={fmtInt(live.length)}
          sub={`${fmtInt(live.filter((b) => b.state === "active").length)} active now`}
        />
        <Stat
          label="Paper bots"
          value={fmtInt(paper.length)}
          sub="Excluded from money figures"
        />
        <Stat
          label="Spendable across live bots"
          value={`${fmtSol(totalFree)} SOL`}
          sub="Same figure the user sees"
        />
        <Stat
          label="Realized PnL (live)"
          value={`${fmtSigned(totalPnl)} SOL`}
          sub={`${fmtInt(totalFills)} confirmed fills`}
          tone={totalPnl > 0 ? "good" : totalPnl < 0 ? "bad" : "plain"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bots</CardTitle>
          <CardDescription>
            {fmtInt(data.bots.length)} total. Click a bot for its config,
            positions and full trade history.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto scrollbar-minimal-black">
            <table className="w-full min-w-[960px] text-left text-xs">
              <thead className="border-y border-white/8 text-[10px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-6 py-2 font-medium">Bot</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 text-right font-medium">Spendable</th>
                  <th className="px-3 py-2 text-right font-medium">Allocated</th>
                  <th className="px-3 py-2 text-right font-medium">Fills</th>
                  <th className="px-3 py-2 text-right font-medium">Volume</th>
                  <th className="px-3 py-2 text-right font-medium">PnL</th>
                  <th className="px-3 py-2 text-right font-medium">Open</th>
                  <th className="px-6 py-2 text-right font-medium">Last trade</th>
                </tr>
              </thead>
              <tbody>
                {data.bots.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-10 text-center text-white/40"
                    >
                      This user has not spawned any bots.
                    </td>
                  </tr>
                ) : (
                  data.bots.map((b) => (
                    <tr
                      key={b.botId}
                      onClick={() => onPick(b.botId)}
                      className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-2.5">
                        <div className="flex items-center gap-2">
                          <BotIcon className="size-3.5 shrink-0 text-white/30" />
                          <span className="font-medium text-white/90">
                            {b.name}
                          </span>
                          {b.paperMode ? <Pill>paper</Pill> : null}
                          {b.expertMode ? <Pill>expert</Pill> : null}
                        </div>
                      </td>
                      <td className="px-3">
                        <Pill className={STATE_TONE[b.state]}>{b.state}</Pill>
                      </td>
                      <td className="px-3 text-right tabular-nums text-white/90">
                        {fmtSol(b.freeSol)}
                      </td>
                      <td className="px-3 text-right tabular-nums text-white/60">
                        {fmtSol(b.allocatedSol)}
                      </td>
                      <td className="px-3 text-right tabular-nums text-white/70">
                        {fmtInt(b.fills)}
                        {b.failedFills > 0 ? (
                          <span className="ml-1 text-[10px] text-red-400/70">
                            {b.failedFills}f
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 text-right tabular-nums text-white/70">
                        {fmtSol(b.volumeSol)}
                      </td>
                      <td
                        className={cn(
                          "px-3 text-right tabular-nums",
                          b.realizedPnlSol > 0
                            ? "text-emerald-400"
                            : b.realizedPnlSol < 0
                              ? "text-red-400"
                              : "text-white/50",
                        )}
                      >
                        {fmtSigned(b.realizedPnlSol)}
                      </td>
                      <td className="px-3 text-right tabular-nums text-white/60">
                        {b.openPositions > 0
                          ? `${b.openPositions} (${fmtSol(b.openCostSol)})`
                          : "-"}
                      </td>
                      <td className="px-6 text-right text-white/40">
                        {fmtWhen(b.lastTradeAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- level 2 -----------------------------------------------------------------

function BotDetail({ botId }: { botId: string }) {
  const [d, setD] = useState<BotDetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/analytics/bots/detail/${botId}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as BotDetailPayload;
      })
      .then((v) => {
        if (!cancelled) {
          setD(v);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [botId]);

  const trades = d?.trades ?? [];
  const pager = usePagination(trades, 50);
  const anchor = usePagerAnchor(pager.page);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bot detail</CardTitle>
          <CardDescription className="text-red-400/80">
            Could not load: {error}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  if (!d?.bot) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const b = d.bot;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{b.name}</CardTitle>
            <Pill className={STATE_TONE[b.state]}>{b.state}</Pill>
            {b.paperMode ? <Pill>paper</Pill> : null}
            {b.expertMode ? <Pill>expert</Pill> : null}
            <Pill>{b.signerKind}</Pill>
            <Pill>config v{b.configVersion}</Pill>
          </div>
          <CardDescription>
            wallet{" "}
            <a
              href={`https://solscan.io/account/${b.walletPubkey}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-white/70 underline decoration-white/20 underline-offset-2 hover:text-white"
            >
              {shortAddr(b.walletPubkey, 6)}
              <ExternalLink className="size-3" />
            </a>{" "}
            · {b.region} · created {fmtWhen(b.createdAt)} · last active{" "}
            {fmtWhen(b.lastActiveAt)}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Spendable"
          value={`${fmtSol(b.freeSol)} SOL`}
          sub="allocated + PnL - fees - deployed"
        />
        <Stat label="Allocated" value={`${fmtSol(b.allocatedSol)} SOL`} sub="User funded" />
        <Stat
          label="Realized PnL"
          value={`${fmtSigned(b.realizedPnlSol)} SOL`}
          sub={`${fmtInt(b.fills)} confirmed fills`}
          tone={b.realizedPnlSol > 0 ? "good" : b.realizedPnlSol < 0 ? "bad" : "plain"}
        />
        <Stat
          label="Open exposure"
          value={`${fmtSol(b.openCostSol)} SOL`}
          sub={`${fmtInt(b.openPositions)} positions, at cost`}
        />
        <Stat label="Volume" value={`${fmtSol(b.volumeSol)} SOL`} sub="Confirmed fills" />
        <Stat label="Fees paid" value={`${fmtSol(b.feesPaidSol)} SOL`} sub="Platform + network" />
        <Stat
          label="Observed balance"
          value={`${fmtSol(b.observedSol)} SOL`}
          sub="Last on-chain read"
        />
        <Stat
          label="Failed fills"
          value={fmtInt(b.failedFills)}
          sub={b.paperFills > 0 ? `${fmtInt(b.paperFills)} paper fills` : "Reverted or dropped"}
          tone={b.failedFills > 0 ? "warn" : "plain"}
        />
      </div>

      {d.positions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Open positions</CardTitle>
            <CardDescription>
              Cost basis, not marked to market. {fmtInt(d.positions.length)} open.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto scrollbar-minimal-black">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="border-y border-white/8 text-[10px] uppercase tracking-wider text-white/40">
                  <tr>
                    <th className="px-6 py-2 font-medium">Mint</th>
                    <th className="px-3 py-2 text-right font-medium">Tokens</th>
                    <th className="px-3 py-2 text-right font-medium">SOL cost</th>
                    <th className="px-3 py-2 text-right font-medium">Entry BC%</th>
                    <th className="px-3 py-2 text-right font-medium">Peak x</th>
                    <th className="px-3 py-2 text-right font-medium">Next tier</th>
                    <th className="px-6 py-2 text-right font-medium">Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {d.positions.map((p) => (
                    <tr key={p.mint} className="border-b border-white/5">
                      <td className="px-6 py-2 font-mono text-white/80">
                        {shortAddr(p.mint, 5)}
                      </td>
                      <td className="px-3 text-right tabular-nums text-white/60">
                        {p.tokenAmount}
                      </td>
                      <td className="px-3 text-right tabular-nums text-white/90">
                        {fmtSol(p.solCost)}
                      </td>
                      <td className="px-3 text-right tabular-nums text-white/60">
                        {p.entryBcPct === null ? "-" : `${p.entryBcPct}%`}
                      </td>
                      <td className="px-3 text-right tabular-nums text-white/60">
                        {p.peakMult}x
                      </td>
                      <td className="px-3 text-right tabular-nums text-white/60">
                        {p.nextTier}
                      </td>
                      <td className="px-6 text-right text-white/40">
                        {fmtWhen(p.openedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <div ref={anchor} className="scroll-mt-6" />
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Trades</CardTitle>
              <CardDescription>
                {fmtInt(d.tradeCount)} total
                {d.tradeCount > trades.length
                  ? `, showing the most recent ${fmtInt(trades.length)}`
                  : ""}
                . Newest first.
              </CardDescription>
            </div>
            <PageSizeSelect value={pager.pageSize} onChange={pager.setPageSize} />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto scrollbar-minimal-black">
            <table className="w-full min-w-[1040px] text-left text-xs">
              <thead className="border-y border-white/8 text-[10px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-6 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Side</th>
                  <th className="px-3 py-2 font-medium">Mint</th>
                  <th className="px-3 py-2 text-right font-medium">SOL</th>
                  <th className="px-3 py-2 text-right font-medium">PnL</th>
                  <th className="px-3 py-2 text-right font-medium">Fees</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Lander</th>
                  <th className="px-6 py-2 font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-white/40">
                      This bot has never traded.
                    </td>
                  </tr>
                ) : (
                  pager.visible.map((t) => (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-6 py-2 text-white/50">{fmtWhen(t.createdAt)}</td>
                      <td className="px-3">
                        <span
                          className={cn(
                            "font-medium",
                            t.side === "buy" ? "text-sky-400" : "text-amber-400",
                          )}
                        >
                          {t.side}
                        </span>
                        {t.tierIndex !== null ? (
                          <span className="ml-1 text-[10px] text-white/35">
                            t{t.tierIndex}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 font-mono text-white/70">
                        {shortAddr(t.mint, 4)}
                      </td>
                      <td className="px-3 text-right tabular-nums text-white/80">
                        {fmtSol(t.solAmount)}
                      </td>
                      <td
                        className={cn(
                          "px-3 text-right tabular-nums",
                          t.pnlSol === null
                            ? "text-white/25"
                            : t.pnlSol > 0
                              ? "text-emerald-400"
                              : t.pnlSol < 0
                                ? "text-red-400"
                                : "text-white/50",
                        )}
                      >
                        {t.pnlSol === null ? "-" : fmtSigned(t.pnlSol)}
                      </td>
                      <td className="px-3 text-right tabular-nums text-white/45">
                        {fmtSol(t.feesSol + t.priorityFeeSol + t.jitoTipSol)}
                      </td>
                      <td className="px-3">
                        <span
                          className={cn(
                            t.status === "confirmed"
                              ? "text-emerald-400/80"
                              : t.status === "failed"
                                ? "text-red-400/80"
                                : "text-amber-400/80",
                          )}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-3 text-white/45">{t.landerWon ?? "-"}</td>
                      <td className="px-6">
                        {t.signature && !t.signature.startsWith("paper") ? (
                          <a
                            href={`https://solscan.io/tx/${t.signature}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-white/50 hover:text-white"
                          >
                            {shortAddr(t.signature, 4)}
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-white/25">
                            {t.signature ? "paper" : "-"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pager p={pager} label="Bot trades pages" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            The stored BotConfig, exactly as the customer configured it.
            Caps: {fmtSol(b.capSol)} SOL position cap, {fmtSol(b.drawdownStopSol)}{" "}
            SOL drawdown stop, {fmtSol(b.spendLimitSol)} SOL spend limit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto rounded-md border border-white/8 bg-black/40 p-3 text-[11px] leading-relaxed text-white/70 scrollbar-minimal-black">
            {JSON.stringify(b.config, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
