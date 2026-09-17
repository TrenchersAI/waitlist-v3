"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, X } from "lucide-react";

import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";
import { deskProfileUrl } from "@/src/lib/ops-desk";

// One row of the per-user breakdown, mirrored from `trenchers-traders.ts`.
type TraderRow = {
  userId: string | null;
  username: string | null;
  displayName: string | null;
  wallet: string | null;
  trades: number;
  volumeSol: number;
  bots: number | null;
  pnlSol: number | null;
  lastTradeAt: string | null;
};

type TradersPayload = {
  floor: string;
  date: string;
  manual: TraderRow[];
  bot: TraderRow[];
};

/** The paper endpoint returns one list (there is no manual leg in paper). */
type PaperTradersPayload = {
  floor: string;
  date: string;
  paper: TraderRow[];
};

/** `manual` / `bot` come from the Trading volume drill-down (live fills);
 *  `paper` is the Paper volume drill-down (paper bot fills, own endpoint). */
export type TradersKind = "manual" | "bot" | "paper";

// Module-level cache keyed by day so switching Manual↔Bot for the same day (or
// re-opening it) doesn't re-hit the endpoint. The API itself is 60s-cached;
// this just avoids redundant round-trips within a session.
const cacheByDate = new Map<string, TradersPayload>();
const paperCacheByDate = new Map<string, PaperTradersPayload>();

function loadTradersForDate(date: string): Promise<TradersPayload> {
  const cached = cacheByDate.get(date);
  if (cached) return Promise.resolve(cached);
  return fetch(
    `/api/analytics/trading/traders?date=${encodeURIComponent(date)}`,
    { cache: "no-store" },
  )
    .then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as TradersPayload;
    })
    .then((p) => {
      cacheByDate.set(date, p);
      return p;
    });
}

function loadPaperTradersForDate(date: string): Promise<PaperTradersPayload> {
  const cached = paperCacheByDate.get(date);
  if (cached) return Promise.resolve(cached);
  return fetch(
    `/api/analytics/paper/traders?date=${encodeURIComponent(date)}`,
    { cache: "no-store" },
  )
    .then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as PaperTradersPayload;
    })
    .then((p) => {
      paperCacheByDate.set(date, p);
      return p;
    });
}

/** Rows + the server-confirmed day for a kind, from whichever endpoint owns it. */
type Loaded = { date: string; rows: TraderRow[] };

function loadForKind(kind: TradersKind, date: string): Promise<Loaded> {
  if (kind === "paper") {
    return loadPaperTradersForDate(date).then((p) => ({
      date: p.date,
      rows: p.paper,
    }));
  }
  return loadTradersForDate(date).then((p) => ({
    date: p.date,
    rows: kind === "manual" ? p.manual : p.bot,
  }));
}

function cachedForKind(kind: TradersKind, date: string): Loaded | null {
  if (kind === "paper") {
    const p = paperCacheByDate.get(date);
    return p ? { date: p.date, rows: p.paper } : null;
  }
  const p = cacheByDate.get(date);
  return p
    ? { date: p.date, rows: kind === "manual" ? p.manual : p.bot }
    : null;
}

// ◎ SOL formatting, identical to the trading dashboards.
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

/** Time-of-day (UTC) for a fill — the day is already in the header, so a
 *  relative "3h ago" would be redundant here. */
function fmtClock(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Human day label: `Wed, Aug 27` (UTC). */
function fmtDayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function shortWallet(w: string | null): string {
  if (!w) return "—";
  return w.length <= 12 ? w : `${w.slice(0, 4)}…${w.slice(-4)}`;
}

/** Label for a user: username → display name → short wallet → short id. Never
 *  blank, so every row is identifiable. */
function traderLabel(r: TraderRow): string {
  if (r.username) return r.username;
  if (r.displayName) return r.displayName;
  if (r.wallet) return shortWallet(r.wallet);
  if (r.userId) return `${r.userId.slice(0, 8)}…`;
  return "unknown";
}

function traderInitial(r: TraderRow): string {
  const ch = traderLabel(r).trim()[0];
  return ch ? ch.toUpperCase() : "?";
}

const COPY: Record<TradersKind, { title: string; noun: string; dot: string }> = {
  manual: { title: "Manual orders", noun: "manual swaps", dot: "#2dd4bf" },
  bot: { title: "Bot orders", noun: "bot fills", dot: "#818cf8" },
  paper: { title: "Paper bot orders", noun: "paper bot fills", dot: "#818cf8" },
};

export function TradersPanel({
  kind,
  date,
  onBack,
  onClose,
}: {
  kind: TradersKind;
  /** The UTC day (YYYY-MM-DD) picked on the chart. */
  date: string;
  /** Back to the Manual/Bot chooser for the same day. Omit (paper) to hide
   *  the button — paper has only one order kind, so there is no chooser. */
  onBack?: () => void;
  /** Close the whole drill-down. */
  onClose: () => void;
}) {
  const [payload, setPayload] = useState<Loaded | null>(
    cachedForKind(kind, date),
  );
  const [loading, setLoading] = useState(!cachedForKind(kind, date));
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // `loading` starts `true` on a cache miss, so no synchronous setState here.
  useEffect(() => {
    let cancelled = false;
    loadForKind(kind, date)
      .then((p) => {
        if (!cancelled) setPayload(p);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, date]);

  const copy = COPY[kind];
  const rows = payload?.rows;
  // Bot-shaped rows (live bot or paper bot) carry bots-fired + realized PnL.
  const botCols = kind !== "manual";
  // Prefer the day the server actually returned; falls back to the requested
  // day while loading. These agree in normal operation — this just guarantees
  // the header can never label a day the rows don't belong to.
  const shownDate = payload?.date ?? date;

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.username?.toLowerCase().includes(q) ||
        r.displayName?.toLowerCase().includes(q) ||
        r.wallet?.toLowerCase().includes(q) ||
        r.userId?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totalVol = useMemo(
    () => (rows ? rows.reduce((a, r) => a + r.volumeSol, 0) : 0),
    [rows],
  );

  return (
    <div className="rounded-xl border border-white/10 bg-black/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              <ArrowLeft className="size-3.5" />
              Back
            </button>
          ) : null}
          <span
            aria-hidden
            className="size-2 rounded-sm"
            style={{ background: copy.dot }}
          />
          <h3 className="text-sm font-semibold text-white">{copy.title}</h3>
          <span className="text-xs text-white/45">· {fmtDayLabel(shownDate)}</span>
          {rows ? (
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium tabular-nums text-white/55">
              {fmtInt(rows.length)} users · ◎{fmtSol(totalVol)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user / wallet…"
            className="h-8 w-44 rounded-lg border border-white/12 bg-black/35 px-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-white/35 focus:ring-2 focus:ring-white/15"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close breakdown"
            className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <p className="px-4 pt-3 text-[11px] text-white/40">
        Users who placed confirmed {copy.noun} on{" "}
        <span className="text-white/60">{fmtDayLabel(shownDate)}</span> (UTC), ranked
        by SOL volume.
      </p>

      <div className="max-h-[420px] overflow-auto p-1">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-black/85 backdrop-blur">
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wide text-white/40">
              <th className="w-10 py-2 pl-3 pr-2 text-center font-medium">#</th>
              <th className="py-2 pr-3 font-medium">User</th>
              <th className="py-2 pr-3 text-right font-medium">Volume</th>
              <th className="py-2 pr-3 text-right font-medium">Trades</th>
              {botCols ? (
                <>
                  <th className="py-2 pr-3 text-right font-medium">Bots</th>
                  <th className="py-2 pr-3 text-right font-medium">PnL</th>
                </>
              ) : null}
              <th className="py-2 pr-3 text-right font-medium">Last (UTC)</th>
              <th className="w-10 py-2 pr-3 text-right font-medium">
                <span className="sr-only">Open in Trench Desk</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} bot={botCols} />
              ))
            ) : error ? (
              <tr>
                <td
                  colSpan={botCols ? 8 : 6}
                  className="px-4 py-8 text-center text-sm text-red-400/80"
                >
                  Couldn&apos;t load traders ({error}).
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={botCols ? 8 : 6}
                  className="px-4 py-8 text-center text-sm text-white/50"
                >
                  {search
                    ? "No users match that search."
                    : "No traders on this day."}
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr
                  key={r.userId ?? r.wallet ?? i}
                  className="border-b border-white/[0.04] text-white/80"
                >
                  <td className="py-2.5 pl-3 pr-2 text-center font-mono text-xs tabular-nums text-white/45">
                    {i + 1}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        aria-hidden
                        className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold text-white/85"
                      >
                        {traderInitial(r)}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="truncate text-[13px] font-medium text-white/90"
                          title={r.userId ?? undefined}
                        >
                          {traderLabel(r)}
                        </div>
                        {r.wallet ? (
                          <div
                            className="truncate font-mono text-[10.5px] text-white/35"
                            title={r.wallet}
                          >
                            {shortWallet(r.wallet)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-[12.5px] tabular-nums text-white/90">
                    ◎{fmtSol(r.volumeSol)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-white/60">
                    {fmtInt(r.trades)}
                  </td>
                  {botCols ? (
                    <>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-white/60">
                        {fmtInt(r.bots ?? 0)}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 pr-3 text-right tabular-nums",
                          (r.pnlSol ?? 0) > 0
                            ? "text-emerald-400"
                            : (r.pnlSol ?? 0) < 0
                              ? "text-red-400"
                              : "text-white/45",
                        )}
                      >
                        {(r.pnlSol ?? 0) > 0 ? "+" : ""}◎{fmtSol(r.pnlSol ?? 0)}
                      </td>
                    </>
                  ) : null}
                  <td className="py-2.5 pr-3 text-right font-mono text-[11px] whitespace-nowrap text-white/45">
                    {fmtClock(r.lastTradeAt)}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    {r.userId ? (
                      <a
                        href={deskProfileUrl(r.userId)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${traderLabel(r)} in Trench Desk`}
                        title="Open in Trench Desk"
                        className="inline-flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/55 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                      >
                        <ArrowUpRight className="size-3.5" />
                      </a>
                    ) : (
                      // A wallet-only row (no platform account) has no desk profile.
                      <span
                        aria-hidden
                        title="No platform account for this wallet"
                        className="inline-flex size-7 items-center justify-center text-white/20"
                      >
                        –
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkeletonRow({ bot }: { bot: boolean }) {
  return (
    <tr className="border-b border-white/[0.04]">
      <td className="py-2.5 pl-3 pr-2 text-center">
        <Skeleton className="mx-auto h-3 w-3" />
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3 w-32 max-w-full" />
        </div>
      </td>
      <td className="py-2.5 pr-3 text-right">
        <Skeleton className="ml-auto h-3 w-14" />
      </td>
      <td className="py-2.5 pr-3 text-right">
        <Skeleton className="ml-auto h-3 w-10" />
      </td>
      {bot ? (
        <>
          <td className="py-2.5 pr-3 text-right">
            <Skeleton className="ml-auto h-3 w-8" />
          </td>
          <td className="py-2.5 pr-3 text-right">
            <Skeleton className="ml-auto h-3 w-12" />
          </td>
        </>
      ) : null}
      <td className="py-2.5 pr-3 text-right">
        <Skeleton className="ml-auto h-3 w-12" />
      </td>
      <td className="py-2.5 pr-3 text-right">
        <Skeleton className="ml-auto size-7 rounded-md" />
      </td>
    </tr>
  );
}
