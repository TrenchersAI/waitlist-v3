"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import type {
  RouterBuySellDay,
  RouterFailures,
  RouterFeesDay,
  RouterOverviewRow,
  RouterPnlDay,
  RouterRailRow,
  RouterSellReason,
  RouterTopBot,
  RouterTopUser,
  RouterTradesPayload,
  RouterVenueRow,
  RouterWindow,
} from "@/src/lib/trenchers-router-trades";
import { cn } from "@/src/lib/utils";

// Series colors, matched to the trading dashboards (teal = buy, indigo = sell).
const C_BUY = "#2dd4bf";
const C_SELL = "#818cf8";
const C_PARTIAL = "#fbbf24";

// ◎ SOL formatting, identical to the Bots / trading dashboards.
function fmtSol(n: number): string {
  const a = Math.abs(n);
  if (a >= 100_000) return `${(n / 1000).toFixed(0)}k`;
  if (a >= 1000) return Math.round(n).toLocaleString("en-US");
  if (a >= 1) return n.toFixed(2);
  if (a === 0) return "0";
  return n.toFixed(a < 0.001 ? 5 : 3);
}

function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
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

/** Truncate an opaque bot_id / user_id for a table cell. */
function shortId(id: string): string {
  if (!id) return "—";
  return id.length <= 14 ? id : `${id.slice(0, 6)}…${id.slice(-4)}`;
}

const WINDOW_LABEL: Record<RouterWindow, string> = {
  "24h": "Last 24h",
  "7d": "Last 7d",
  all: "All time",
};

export function RouterTradesContent() {
  const [data, setData] = useState<RouterTradesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // No synchronous setState here: `loading` starts true for the first mount and
  // the Refresh button flips it before bumping `nonce`. Mirrors bots-view.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/router-trades", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as RouterTradesPayload;
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

  // Auto-refresh every 30s while the tab is visible — same cadence as Bots.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setNonce((n) => n + 1);
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading && !data) return <LoadingState />;

  // Only take over the whole view on the INITIAL load failure (no data yet). A
  // failed auto/manual refresh AFTER a good load keeps the last-loaded analytics
  // (and the Refresh button) rather than blanking to an error-only card; the
  // next successful refresh clears `error` (setError(null) above).
  if (error && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Router trades</CardTitle>
          <CardDescription className="text-red-400/80">
            Could not load router trade analytics: {error}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (data && !data.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Router trades</CardTitle>
          <CardDescription>
            <code className="text-white/70">TRENCHERS_DATABASE_URL</code> is not
            set, so there is no connection to the trading database. Set it in
            Vercel and in <code className="text-white/70">.env</code>. Showing
            nothing rather than zeros, which would read as &ldquo;nothing is
            trading&rdquo;.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const d = data!;
  const all = d.overview.find((o) => o.window === "all");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Router trades</h2>
          <p className="text-sm text-white/50">
            Live router execution from <code className="text-white/60">bot_trades</code>{" "}
            — confirmed, non-paper fills only. Not cached, re-polled every 30s.
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

      {/* Headline KPIs — the all-time window. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Trades (all time)"
          value={fmtInt(all?.trades ?? 0)}
          sub={`${fmtInt(all?.buys ?? 0)} buy · ${fmtInt(all?.sells ?? 0)} sell · ${fmtInt(all?.partials ?? 0)} partial`}
        />
        <Stat
          label="Volume"
          value={`◎${fmtSol(all?.volumeSol ?? 0)}`}
          sub={`${fmtInt(all?.distinctBots ?? 0)} bots · ${fmtInt(all?.distinctUsers ?? 0)} users`}
        />
        <Stat
          label="Fees collected"
          value={`◎${fmtSol(all?.feesSol ?? 0)}`}
          sub="Platform fee, from fees_lamports"
        />
        <Stat
          label="Realized PnL"
          value={`◎${fmtSol(all?.pnlSol ?? 0)}`}
          sub="Sum of pnl_lamports (sells)"
          tone={
            (all?.pnlSol ?? 0) > 0
              ? "good"
              : (all?.pnlSol ?? 0) < 0
                ? "bad"
                : "plain"
          }
        />
      </div>

      <OverviewTable rows={d.overview} />

      <BuySellChart days={d.buySellDaily} />

      <div className="grid gap-4 lg:grid-cols-2">
        <RailWinRate rows={d.railWinRate} />
        <SellReasons rows={d.sellReasons} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FeesDailyTable rows={d.feesRevenueDaily} />
        <PnlDaily rows={d.pnlDaily} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopBots rows={d.topBots} />
        <TopUsers rows={d.topUsers} />
      </div>

      {/* Failure rate + venue split light up once the backend migration lands.
          Until then each stays "wiring up" — never a fabricated number. */}
      <div className="grid gap-4 lg:grid-cols-2">
        {d.failures === null ? (
          <WiringUpPanel
            title="Failure rate & reasons"
            body="Success and failure rate, and the breakdown of why trades fail, are wired from the engine's per-attempt log into the database. Until that table is deployed, every figure above is confirmed fills by construction, so no failure rate is estimated here."
          />
        ) : (
          <FailureRatePanel data={d.failures} />
        )}
        {d.venueSplit === null ? (
          <WiringUpPanel
            title="Venue split (Jupiter / PumpSwap / pump.fun)"
            body="Per-venue volume needs a venue column on bot_trades. Until each fill records the router it landed on, a venue breakdown here would be guessed, so it is intentionally left blank."
          />
        ) : (
          <VenueSplitPanel rows={d.venueSplit} />
        )}
      </div>

      <p className="text-[11px] text-white/35">
        Paper trades are excluded per-trade by their synthetic{" "}
        <code className="text-white/50">paper%</code> signature, never by a
        bot&rsquo;s current paper-mode flag, so flipping a bot to paper does not
        rewrite its history. SOL figures are lamports ÷ 1e9, reconciling exactly
        against on-chain. Data floor Jul 25. Generated {fmtWhen(d.generatedAt)}.
      </p>
    </div>
  );
}

// =========================================================================
// OVERVIEW TABLE
// =========================================================================

function OverviewTable({ rows }: { rows: RouterOverviewRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>By window</CardTitle>
        <CardDescription>
          Every row is confirmed, non-paper fills. Success rate is 100% by
          construction — failures are not persisted yet (see below).
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto scrollbar-minimal-black">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-y border-white/8 text-[10px] uppercase tracking-wider text-white/40">
              <tr>
                <Th className="pl-6">Window</Th>
                <Th align="right">Trades</Th>
                <Th align="right">Buys</Th>
                <Th align="right">Sells</Th>
                <Th align="right">Partials</Th>
                <Th align="right">Volume</Th>
                <Th align="right">Fees</Th>
                <Th align="right">PnL</Th>
                <Th align="right">Bots</Th>
                <Th align="right" className="pr-6">
                  Users
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.window}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="py-2.5 pl-6 pr-3 font-medium text-white/90">
                    {WINDOW_LABEL[r.window]}
                  </td>
                  <td className="px-3 text-right tabular-nums text-white/90">
                    {fmtInt(r.trades)}
                  </td>
                  <td className="px-3 text-right tabular-nums text-white/70">
                    {fmtInt(r.buys)}
                  </td>
                  <td className="px-3 text-right tabular-nums text-white/70">
                    {fmtInt(r.sells)}
                  </td>
                  <td className="px-3 text-right tabular-nums text-white/70">
                    {fmtInt(r.partials)}
                  </td>
                  <td className="px-3 text-right tabular-nums text-white/80">
                    ◎{fmtSol(r.volumeSol)}
                  </td>
                  <td className="px-3 text-right tabular-nums text-white/70">
                    ◎{fmtSol(r.feesSol)}
                  </td>
                  <td
                    className={cn(
                      "px-3 text-right tabular-nums",
                      r.pnlSol > 0
                        ? "text-emerald-400"
                        : r.pnlSol < 0
                          ? "text-red-400"
                          : "text-white/50",
                    )}
                  >
                    {r.pnlSol > 0 ? "+" : ""}◎{fmtSol(r.pnlSol)}
                  </td>
                  <td className="px-3 text-right tabular-nums text-white/70">
                    {fmtInt(r.distinctBots)}
                  </td>
                  <td className="pr-6 pl-3 text-right tabular-nums text-white/70">
                    {fmtInt(r.distinctUsers)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// =========================================================================
// BUY / SELL / PARTIAL — daily stacked bars
// =========================================================================

function BuySellChart({ days }: { days: RouterBuySellDay[] }) {
  const maxTotal = useMemo(
    () =>
      Math.max(
        1,
        ...days.map((d) => d.buys + d.sells + d.partials),
      ),
    [days],
  );
  const labelEvery = Math.max(1, Math.ceil(days.length / 10));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle>Buy / sell mix per day</CardTitle>
            <CardDescription>
              Confirmed fills per UTC day, stacked by side.
            </CardDescription>
          </div>
          <Legend
            items={[
              { color: C_BUY, label: "Buy" },
              { color: C_SELL, label: "Sell" },
              { color: C_PARTIAL, label: "Partial" },
            ]}
          />
        </div>
      </CardHeader>
      <CardContent>
        {days.length === 0 ? (
          <EmptyNote>No confirmed router fills in range yet.</EmptyNote>
        ) : (
          <div className="flex h-[200px] items-end gap-1 overflow-x-auto scrollbar-minimal-black">
            {days.map((d, i) => {
              const total = d.buys + d.sells + d.partials;
              const h = (total / maxTotal) * 168;
              const seg = (n: number) => (total > 0 ? (n / total) * h : 0);
              return (
                <div
                  key={d.date}
                  className="flex min-w-[16px] flex-1 flex-col items-center gap-1"
                  title={`${d.date}\nBuy ${fmtInt(d.buys)} · Sell ${fmtInt(d.sells)} · Partial ${fmtInt(d.partials)}`}
                >
                  <div
                    className="flex w-full max-w-[26px] flex-col-reverse overflow-hidden rounded-sm"
                    style={{ height: `${h}px` }}
                  >
                    <span style={{ height: seg(d.buys), background: C_BUY }} />
                    <span style={{ height: seg(d.sells), background: C_SELL }} />
                    <span
                      style={{ height: seg(d.partials), background: C_PARTIAL }}
                    />
                  </div>
                  <span className="h-3 text-[9px] tabular-nums text-white/35">
                    {i % labelEvery === 0 ? d.date.slice(5) : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// RAIL WIN RATE
// =========================================================================

function RailWinRate({ rows }: { rows: RouterRailRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Landing rail win rate</CardTitle>
        <CardDescription>
          Which lander landed each fill, from <code>lander_won</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {rows.length === 0 ? (
          <EmptyNote>No landed fills in range yet.</EmptyNote>
        ) : (
          rows.map((r) => (
            <div key={r.lander} className="flex items-center gap-3">
              <span className="w-20 shrink-0 truncate text-xs text-white/70">
                {r.lander}
              </span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-indigo-400/80"
                  style={{ width: `${Math.max(1, r.pct)}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-xs tabular-nums text-white/60">
                {fmtInt(r.trades)}{" "}
                <span className="text-white/35">({fmtPct(r.pct)})</span>
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// SELL REASONS
// =========================================================================

function SellReasons({ rows }: { rows: RouterSellReason[] }) {
  const max = Math.max(1, ...rows.map((r) => r.trades));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sell reasons</CardTitle>
        <CardDescription>
          Why sells &amp; partial sells fired, from <code>reason</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <div className="px-4">
            <EmptyNote>No labeled sell reasons in range yet.</EmptyNote>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-minimal-black">
            <table className="w-full min-w-[320px] text-left text-xs">
              <thead className="border-y border-white/8 text-[10px] uppercase tracking-wider text-white/40">
                <tr>
                  <Th className="pl-6">Reason</Th>
                  <Th align="right" className="pr-6">
                    Trades
                  </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.reason}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="py-2 pl-6 pr-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-white/80">{r.reason}</span>
                        <span
                          className="h-1 rounded-full bg-teal-400/70"
                          style={{ width: `${(r.trades / max) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="pr-6 pl-3 text-right align-top tabular-nums text-white/70">
                      {fmtInt(r.trades)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// FEES DAILY
// =========================================================================

function FeesDailyTable({ rows }: { rows: RouterFeesDay[] }) {
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          fees: acc.fees + r.feesSol,
          priority: acc.priority + r.priorityFeeSol,
          jito: acc.jito + r.jitoTipSol,
        }),
        { fees: 0, priority: 0, jito: 0 },
      ),
    [rows],
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fees &amp; landing cost per day</CardTitle>
        <CardDescription>
          Platform fee revenue, and the priority fee / Jito tip paid to land
          (SOL).
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <div className="px-4">
            <EmptyNote>No fee rows in range yet.</EmptyNote>
          </div>
        ) : (
          <div className="max-h-[280px] overflow-auto scrollbar-minimal-black">
            <table className="w-full min-w-[360px] text-left text-xs">
              <thead className="sticky top-0 z-10 border-y border-white/8 bg-black/85 text-[10px] uppercase tracking-wider text-white/40 backdrop-blur">
                <tr>
                  <Th className="pl-6">Day</Th>
                  <Th align="right">Platform fee</Th>
                  <Th align="right">Priority</Th>
                  <Th align="right" className="pr-6">
                    Jito tip
                  </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.date}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="py-2 pl-6 pr-3 tabular-nums text-white/70">
                      {r.date.slice(5)}
                    </td>
                    <td className="px-3 text-right tabular-nums text-white/80">
                      ◎{fmtSol(r.feesSol)}
                    </td>
                    <td className="px-3 text-right tabular-nums text-white/60">
                      ◎{fmtSol(r.priorityFeeSol)}
                    </td>
                    <td className="pr-6 pl-3 text-right tabular-nums text-white/60">
                      ◎{fmtSol(r.jitoTipSol)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 text-white/80">
                  <td className="py-2 pl-6 pr-3 font-medium">Total</td>
                  <td className="px-3 text-right font-medium tabular-nums">
                    ◎{fmtSol(totals.fees)}
                  </td>
                  <td className="px-3 text-right tabular-nums">
                    ◎{fmtSol(totals.priority)}
                  </td>
                  <td className="pr-6 pl-3 text-right tabular-nums">
                    ◎{fmtSol(totals.jito)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// PnL DAILY — diverging bars
// =========================================================================

function PnlDaily({ rows }: { rows: RouterPnlDay[] }) {
  const maxAbs = Math.max(1e-9, ...rows.map((r) => Math.abs(r.pnlSol)));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Realized PnL per day</CardTitle>
        <CardDescription>
          Sum of <code>pnl_lamports</code> on sells, per UTC day (SOL).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {rows.length === 0 ? (
          <EmptyNote>No realized PnL in range yet.</EmptyNote>
        ) : (
          rows.map((r) => {
            const w = (Math.abs(r.pnlSol) / maxAbs) * 50;
            const pos = r.pnlSol >= 0;
            return (
              <div key={r.date} className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-[10px] tabular-nums text-white/40">
                  {r.date.slice(5)}
                </span>
                <div className="relative h-3 flex-1">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-white/15" />
                  <span
                    className={cn(
                      "absolute inset-y-0 rounded-sm",
                      pos ? "bg-emerald-400/80" : "bg-red-400/80",
                    )}
                    style={
                      pos
                        ? { left: "50%", width: `${w}%` }
                        : { right: "50%", width: `${w}%` }
                    }
                  />
                </div>
                <span
                  className={cn(
                    "w-20 shrink-0 text-right text-xs tabular-nums",
                    pos ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {pos ? "+" : ""}◎{fmtSol(r.pnlSol)}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// TOP BOTS / USERS
// =========================================================================

function TopBots({ rows }: { rows: RouterTopBot[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top bots by volume</CardTitle>
        <CardDescription>Top 20 bot_id by SOL volume.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <div className="px-4">
            <EmptyNote>No bots in range yet.</EmptyNote>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-minimal-black">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead className="border-y border-white/8 text-[10px] uppercase tracking-wider text-white/40">
                <tr>
                  <Th className="pl-6">Bot</Th>
                  <Th align="right">Trades</Th>
                  <Th align="right">Volume</Th>
                  <Th align="right" className="pr-6">
                    PnL
                  </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.botId}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td
                      className="py-2 pl-6 pr-3 font-mono text-white/80"
                      title={r.botId}
                    >
                      {shortId(r.botId)}
                    </td>
                    <td className="px-3 text-right tabular-nums text-white/70">
                      {fmtInt(r.trades)}
                    </td>
                    <td className="px-3 text-right tabular-nums text-white/80">
                      ◎{fmtSol(r.volumeSol)}
                    </td>
                    <td
                      className={cn(
                        "pr-6 pl-3 text-right tabular-nums",
                        r.pnlSol > 0
                          ? "text-emerald-400"
                          : r.pnlSol < 0
                            ? "text-red-400"
                            : "text-white/50",
                      )}
                    >
                      {r.pnlSol > 0 ? "+" : ""}◎{fmtSol(r.pnlSol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopUsers({ rows }: { rows: RouterTopUser[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top users by volume</CardTitle>
        <CardDescription>Top 20 user_id by SOL volume.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <div className="px-4">
            <EmptyNote>No users in range yet.</EmptyNote>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-minimal-black">
            <table className="w-full min-w-[360px] text-left text-xs">
              <thead className="border-y border-white/8 text-[10px] uppercase tracking-wider text-white/40">
                <tr>
                  <Th className="pl-6">User</Th>
                  <Th align="right">Trades</Th>
                  <Th align="right" className="pr-6">
                    Volume
                  </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.userId}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td
                      className="py-2 pl-6 pr-3 font-mono text-white/80"
                      title={r.userId}
                    >
                      {shortId(r.userId)}
                    </td>
                    <td className="px-3 text-right tabular-nums text-white/70">
                      {fmtInt(r.trades)}
                    </td>
                    <td className="pr-6 pl-3 text-right tabular-nums text-white/80">
                      ◎{fmtSol(r.volumeSol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// WIRING-UP PLACEHOLDER (known gaps — NO fabricated numbers)
// =========================================================================

function VenueSplitPanel({ rows }: { rows: RouterVenueRow[] }) {
  // Once the `venue` column exists but before new fills accrue, every
  // historical row reads back as 'unknown'. Show that honestly rather than
  // pretending we know the router split for legacy trades.
  const onlyUnknown =
    rows.length > 0 && rows.every((r) => r.venue === "unknown");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Venue split (Jupiter / PumpSwap / pump.fun)</CardTitle>
        <CardDescription>
          Which router each CONFIRMED fill landed on. Fills recorded before
          venue tracking read back as{" "}
          <span className="text-white/55">unknown</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 || onlyUnknown ? (
          <div className="px-4">
            <EmptyNote>
              No venue-tagged fills yet. Only trades since the venue column
              deployed carry a router, so real splits appear as new fills land.
            </EmptyNote>
          </div>
        ) : (
          <div className="max-h-[280px] overflow-auto scrollbar-minimal-black">
            <table className="w-full min-w-[360px] text-left text-xs">
              <thead className="sticky top-0 z-10 border-y border-white/8 bg-black/85 text-[10px] uppercase tracking-wider text-white/40 backdrop-blur">
                <tr>
                  <Th className="pl-6">Venue</Th>
                  <Th align="right">Trades</Th>
                  <Th align="right">Share</Th>
                  <Th align="right" className="pr-6">
                    Volume (SOL)
                  </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.venue} className="border-b border-white/5">
                    <td className="py-2 pl-6 pr-3 text-white/75">{r.venue}</td>
                    <td className="px-3 text-right tabular-nums text-white/80">
                      {fmtInt(r.trades)}
                    </td>
                    <td className="px-3 text-right tabular-nums text-white/60">
                      {fmtPct(r.pct)}
                    </td>
                    <td className="pr-6 pl-3 text-right tabular-nums text-white/60">
                      {fmtSol(r.volumeSol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FailureRatePanel({ data }: { data: RouterFailures }) {
  const noFailures = data.perWindow.every((w) => w.failed === 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Failure rate &amp; reasons</CardTitle>
        <CardDescription>
          Failed / (confirmed + failed) from the engine&rsquo;s per-attempt log.
          Reason tokens match the backend failure classifier.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="grid grid-cols-3 gap-2 px-4">
          {data.perWindow.map((w) => (
            <div
              key={w.window}
              className="rounded-lg border border-white/8 bg-white/[0.02] p-3"
            >
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                {w.window} fail rate
              </div>
              <div className="mt-1 text-lg font-semibold text-white/90 tabular-nums">
                {fmtPct(w.ratePct)}
              </div>
              <div className="text-[11px] tabular-nums text-white/40">
                {fmtInt(w.failed)} failed / {fmtInt(w.confirmed + w.failed)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          {data.reasons.length === 0 || noFailures ? (
            <div className="px-4">
              <EmptyNote>No failures recorded in range.</EmptyNote>
            </div>
          ) : (
            <div className="max-h-[240px] overflow-auto scrollbar-minimal-black">
              <table className="w-full min-w-[280px] text-left text-xs">
                <thead className="sticky top-0 z-10 border-y border-white/8 bg-black/85 text-[10px] uppercase tracking-wider text-white/40 backdrop-blur">
                  <tr>
                    <Th className="pl-6">Reason</Th>
                    <Th align="right" className="pr-6">
                      Count
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {data.reasons.map((r) => (
                    <tr key={r.reason} className="border-b border-white/5">
                      <td className="py-2 pl-6 pr-3 text-white/75">
                        {r.reason}
                      </td>
                      <td className="pr-6 pl-3 text-right tabular-nums text-white/80">
                        {fmtInt(r.count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WiringUpPanel({ title, body }: { title: string; body: string }) {
  return (
    <Card className="border-dashed border-white/12 bg-white/[0.015]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex size-1.5 animate-pulse rounded-full bg-amber-400/80"
          />
          <CardTitle className="text-white/80">{title}</CardTitle>
          <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-amber-300/80">
            Wiring up
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs leading-relaxed text-white/45">{body}</p>
      </CardContent>
    </Card>
  );
}

// =========================================================================
// SHARED BITS
// =========================================================================

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

function Legend({
  items,
}: {
  items: { color: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((it) => (
        <span
          key={it.label}
          className="inline-flex items-center gap-1.5 text-[11px] text-white/50"
        >
          <span
            aria-hidden
            className="size-2 rounded-sm"
            style={{ background: it.color }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-24 items-center justify-center text-center text-xs text-white/40">
      {children}
    </div>
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
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-56 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
