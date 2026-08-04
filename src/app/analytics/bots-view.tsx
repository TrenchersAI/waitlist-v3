"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";

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
import { BotsDrilldown } from "@/src/app/analytics/bots-drilldown";
import type {
  BotsByState,
  BotsPayload,
  BotUserRow,
} from "@/src/lib/trenchers-bots";
import { cn } from "@/src/lib/utils";

// ◎ SOL formatting, matched to the trading dashboards.
function fmtSol(n: number): string {
  const a = Math.abs(n);
  if (a >= 100_000) return `${(n / 1000).toFixed(0)}k`;
  if (a >= 1000) return Math.round(n).toLocaleString("en-US");
  if (a >= 1) return n.toFixed(2);
  if (a === 0) return "0";
  return n.toFixed(a < 0.001 ? 5 : 3);
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const mins = Math.floor((Date.now() - then) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function shortAddr(a: string | null): string {
  if (!a) return "—";
  return a.length <= 12 ? a : `${a.slice(0, 4)}…${a.slice(-4)}`;
}

type SortKey =
  | "netDepositedSol"
  | "realizedPnlSol"
  | "volumeSol"
  | "liveFills"
  | "botsLive";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "netDepositedSol", label: "Net deposited" },
  { key: "realizedPnlSol", label: "PnL" },
  { key: "volumeSol", label: "Volume" },
  { key: "liveFills", label: "Fills" },
  { key: "botsLive", label: "Live bots" },
];

type Filter = "all" | "live" | "idle" | "depositors";

const FILTERS: { key: Filter; label: string; hint: string }[] = [
  { key: "all", label: "All", hint: "Everyone with a bot, deposit, or fill" },
  { key: "live", label: "Trading", hint: "Has at least one live fill" },
  {
    key: "idle",
    label: "Spawned, not trading",
    hint: "Has a live bot but has never produced a live fill",
  },
  { key: "depositors", label: "Depositors", hint: "Has deposited SOL" },
];

export function BotsAnalyticsContent() {
  const [data, setData] = useState<BotsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("netDepositedSol");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [nonce, setNonce] = useState(0);
  // Drill-down target. When set, the whole tab becomes that user's bot list
  // rather than a modal over the table: the detail view is dense enough that a
  // dialog would spend most of its height on chrome.
  const [drill, setDrill] = useState<{ id: string; label: string } | null>(null);

  // No synchronous setState in here: `loading` starts true for the initial
  // mount, and the Refresh button flips it back on before bumping `nonce`.
  // Setting it here instead would trigger a cascading render (and trips
  // react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/bots", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as BotsPayload;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  // Auto-refresh on the same cadence as Live pulse. Bumping `nonce` re-runs the
  // fetch effect above without flipping `loading`, so the table refreshes in
  // place instead of blinking back to skeletons every 30s. Paused while the tab
  // is hidden: polling a background tab burns prod DB round-trips for a screen
  // nobody is looking at.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setNonce((n) => n + 1);
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    let out = data.users;
    if (filter === "live") out = out.filter((r) => r.liveFills > 0);
    else if (filter === "idle") out = out.filter((r) => r.spawnedNotTrading);
    else if (filter === "depositors") out = out.filter((r) => r.depositedSol > 0);
    if (q) {
      out = out.filter(
        (r) =>
          r.email?.toLowerCase().includes(q) ||
          r.name?.toLowerCase().includes(q) ||
          r.walletAddress?.toLowerCase().includes(q) ||
          r.userId.toLowerCase().includes(q),
      );
    }
    return [...out].sort((a, b) => b[sort] - a[sort]);
  }, [data, filter, search, sort]);

  // Declared before the early returns below: hooks cannot be called
  // conditionally, and the loading / error / unavailable branches all bail out.
  const pager = usePagination(rows);
  const pagerAnchor = usePagerAnchor(pager.page);

  if (loading && !data) return <LoadingState />;

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bots</CardTitle>
          <CardDescription className="text-red-400/80">
            Could not load bot analytics: {error}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (data && !data.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bots</CardTitle>
          <CardDescription>
            <code className="text-white/70">TRENCHERS_DATABASE_URL</code> is not
            set, so there is no connection to the trading database. Set it in
            Vercel and in <code className="text-white/70">.env</code>. Showing
            nothing rather than zeros, which would read as &ldquo;no one is
            trading&rdquo;.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (drill) {
    return (
      <BotsDrilldown
        userId={drill.id}
        label={drill.label}
        onBack={() => setDrill(null)}
      />
    );
  }

  const s = data!.summary;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Bots</h2>
          <p className="text-sm text-white/50">
            Live bot adoption, deposits and realized PnL, straight from the
            trading database. Not cached, and re-polled every 30 seconds.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setNonce((n) => n + 1);
          }}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Users with live bots"
          value={s.usersWithLiveBots.toLocaleString("en-US")}
          sub={`${s.usersWithActiveLiveBots} with a bot running now`}
        />
        <Stat
          label="Spawned, not trading"
          value={s.usersSpawnedNotTrading.toLocaleString("en-US")}
          sub="Live bot, zero live fills"
          tone={s.usersSpawnedNotTrading > 0 ? "warn" : "plain"}
        />
        <Stat
          label="Net SOL deposited"
          value={`◎${fmtSol(s.netDepositedSol)}`}
          sub={`◎${fmtSol(s.depositedSol)} in · ◎${fmtSol(s.withdrawnSol)} out · ${s.depositorCount} depositors`}
        />
        <Stat
          label="Realized PnL"
          value={`◎${fmtSol(s.realizedPnlSol)}`}
          sub={`${s.liveFills.toLocaleString("en-US")} live fills · ◎${fmtSol(s.volumeSol)} volume`}
          tone={s.realizedPnlSol < 0 ? "bad" : s.realizedPnlSol > 0 ? "good" : "plain"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Live bots" value={s.liveBots.toLocaleString("en-US")} sub={`${s.activeLiveBots} active`} />
        <Stat label="Paper bots" value={s.paperBots.toLocaleString("en-US")} sub="Excluded from all money figures" />
        <Stat label="Traded (24h)" value={s.usersTradingLast24h.toLocaleString("en-US")} sub="Distinct users with a live fill" />
        <Stat label="Users with any bot" value={s.usersWithAnyBot.toLocaleString("en-US")} sub="Including paper-only" />
      </div>

      <StateBreakdown rows={data!.byState} />

      <Card>
        <div ref={pagerAnchor} className="scroll-mt-6" />
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Per-user detail</CardTitle>
              <CardDescription>
                {rows.length.toLocaleString("en-US")} of{" "}
                {data!.users.length.toLocaleString("en-US")} users
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <PageSizeSelect
                value={pager.pageSize}
                onChange={pager.setPageSize}
              />
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Email, name, wallet…"
                className="h-8 w-56 rounded-md border border-white/10 bg-black/40 pl-8 pr-2 text-xs text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
              />
            </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                title={f.hint}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  filter === f.key
                    ? "bg-white/[0.09] text-white"
                    : "text-white/50 hover:bg-white/[0.04] hover:text-white/80",
                )}
              >
                {f.label}
              </button>
            ))}
            <span className="mx-1 w-px self-stretch bg-white/10" aria-hidden />
            {SORTS.map((sk) => (
              <button
                key={sk.key}
                type="button"
                onClick={() => setSort(sk.key)}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  sort === sk.key
                    ? "bg-white/[0.09] text-white"
                    : "text-white/50 hover:bg-white/[0.04] hover:text-white/80",
                )}
              >
                ↓ {sk.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="px-0">
          <div className="overflow-x-auto scrollbar-minimal-black">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-y border-white/8 text-[10px] uppercase tracking-wider text-white/40">
                <tr>
                  <Th className="pl-6">User</Th>
                  <Th align="right">Bots</Th>
                  <Th align="right">Deposited</Th>
                  <Th align="right">Net</Th>
                  <Th align="right">Fills</Th>
                  <Th align="right">Volume</Th>
                  <Th align="right">PnL</Th>
                  <Th align="right" className="pr-6">Last trade</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-white/40">
                      No users match this filter.
                    </td>
                  </tr>
                ) : (
                  pager.visible.map((r) => (
                    <UserRow
                      key={r.userId}
                      row={r}
                      onSelect={() =>
                        setDrill({
                          id: r.userId,
                          label: r.email ?? r.name ?? r.userId,
                        })
                      }
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pager p={pager} label="Bot users pages" />
        </CardContent>
      </Card>

      <p className="text-[11px] text-white/35">
        Paper bots are excluded from every money figure. Live vs paper is decided
        per trade by the on-chain signature, not by the bot&rsquo;s current
        paper-mode flag, so flipping a bot to paper does not rewrite its history.
        Generated {fmtWhen(data!.generatedAt)}.
      </p>
    </div>
  );
}

function UserRow({
  row: r,
  onSelect,
}: {
  row: BotUserRow;
  onSelect: () => void;
}) {
  return (
    <tr
      onClick={onSelect}
      className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.03]"
    >
      <td className="py-2.5 pl-6 pr-3">
        <div className="flex flex-col">
          <span className="font-medium text-white/90">
            {r.name ?? r.email ?? shortAddr(r.walletAddress)}
          </span>
          <span className="text-[11px] text-white/40">
            {r.email ?? "no email"} · {shortAddr(r.walletAddress)}
          </span>
        </div>
      </td>
      <td className="px-3 text-right tabular-nums text-white/70">
        {r.botsLive}
        {r.botsActive > 0 ? (
          <span className="ml-1 text-[10px] text-emerald-400/80">
            {r.botsActive} on
          </span>
        ) : null}
        {r.botsPaper > 0 ? (
          <span className="ml-1 text-[10px] text-white/30">
            +{r.botsPaper}p
          </span>
        ) : null}
      </td>
      <td className="px-3 text-right tabular-nums text-white/70">
        ◎{fmtSol(r.depositedSol)}
      </td>
      <td className="px-3 text-right tabular-nums text-white/90">
        ◎{fmtSol(r.netDepositedSol)}
      </td>
      <td className="px-3 text-right tabular-nums text-white/70">
        {r.liveFills > 0 ? (
          r.liveFills.toLocaleString("en-US")
        ) : (
          <span className="text-amber-400/70">0</span>
        )}
      </td>
      <td className="px-3 text-right tabular-nums text-white/70">
        ◎{fmtSol(r.volumeSol)}
      </td>
      <td
        className={cn(
          "px-3 text-right tabular-nums",
          r.realizedPnlSol > 0
            ? "text-emerald-400"
            : r.realizedPnlSol < 0
              ? "text-red-400"
              : "text-white/50",
        )}
      >
        {r.realizedPnlSol > 0 ? "+" : ""}
        ◎{fmtSol(r.realizedPnlSol)}
      </td>
      <td className="pr-6 pl-3 text-right text-white/45">
        {fmtWhen(r.lastTradeAt)}
      </td>
    </tr>
  );
}

function StateBreakdown({ rows }: { rows: BotsByState[] }) {
  if (rows.length === 0) return null;
  const order: BotsByState["state"][] = [
    "active",
    "funded",
    "paused",
    "draft",
    "drained",
    "archived",
  ];
  const sorted = [...rows].sort(
    (a, b) => order.indexOf(a.state) - order.indexOf(b.state),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bots by state</CardTitle>
        <CardDescription>
          Live bots by lifecycle state, with paper bots shown separately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {sorted.map((r) => (
            <div
              key={r.state}
              className="rounded-md border border-white/8 bg-black/30 px-3 py-2"
            >
              <p className="text-[10px] uppercase tracking-wider text-white/40">
                {r.state}
              </p>
              <p className="tabular-nums text-white">
                {r.live}
                {r.paper > 0 ? (
                  <span className="ml-1.5 text-[11px] text-white/35">
                    +{r.paper} paper
                  </span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-white/40">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums",
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
        {sub ? <p className="mt-1 text-[11px] text-white/40">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

function Th({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-3 py-2 font-medium",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
