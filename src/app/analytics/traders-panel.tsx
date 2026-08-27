"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";

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
  manual: TraderRow[];
  bot: TraderRow[];
};

type TradersKind = "manual" | "bot";

// Module-level cache so re-opening the panel (or flipping manual↔bot) doesn't
// re-hit the endpoint every time. The API itself is 60s-cached; this just
// avoids a redundant round-trip within a session.
let cachedPayload: TradersPayload | null = null;
let inflight: Promise<TradersPayload> | null = null;

function loadTraders(): Promise<TradersPayload> {
  if (cachedPayload) return Promise.resolve(cachedPayload);
  if (inflight) return inflight;
  inflight = fetch("/api/analytics/trading/traders", { cache: "no-store" })
    .then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as TradersPayload;
    })
    .then((p) => {
      cachedPayload = p;
      inflight = null;
      return p;
    })
    .catch((e) => {
      inflight = null;
      throw e;
    });
  return inflight;
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

function shortWallet(w: string | null): string {
  if (!w) return "—";
  return w.length <= 12 ? w : `${w.slice(0, 4)}…${w.slice(-4)}`;
}

/** The label we show for a user: username → display name → short wallet →
 *  short user id. Never blank, so every row is identifiable. */
function traderLabel(r: TraderRow): string {
  if (r.username) return r.username;
  if (r.displayName) return r.displayName;
  if (r.wallet) return shortWallet(r.wallet);
  if (r.userId) return `${r.userId.slice(0, 8)}…`;
  return "unknown";
}

function traderInitial(r: TraderRow): string {
  const label = traderLabel(r);
  const ch = label.trim()[0];
  return ch ? ch.toUpperCase() : "?";
}

const COPY: Record<
  TradersKind,
  { title: string; blurb: string; dot: string }
> = {
  manual: {
    title: "Manual traders",
    blurb:
      "Every user who placed a confirmed manual swap since Jul 25, ranked by SOL volume.",
    dot: "#2dd4bf",
  },
  bot: {
    title: "Bot traders",
    blurb:
      "Every user whose bots placed a confirmed live fill since Jul 25, ranked by SOL volume.",
    dot: "#818cf8",
  },
};

export function TradersPanel({
  kind,
  onClose,
}: {
  kind: TradersKind;
  onClose: () => void;
}) {
  const [payload, setPayload] = useState<TradersPayload | null>(cachedPayload);
  const [loading, setLoading] = useState(!cachedPayload);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // `loading` starts `!cachedPayload`, so it's already true on the miss path
    // and false when the cache is warm — no synchronous setState needed here.
    if (cachedPayload) return;
    let cancelled = false;
    loadTraders()
      .then((p) => {
        if (!cancelled) {
          setPayload(p);
          setError(null);
        }
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
  }, []);

  const copy = COPY[kind];
  const rows = kind === "manual" ? payload?.manual : payload?.bot;

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.username?.toLowerCase().includes(q) ||
        r.displayName?.toLowerCase().includes(q) ||
        r.wallet?.toLowerCase().includes(q) ||
        r.userId?.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const totalVol = useMemo(
    () => (rows ? rows.reduce((a, r) => a + r.volumeSol, 0) : 0),
    [rows],
  );

  return (
    <div className="rounded-xl border border-white/10 bg-black/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2 rounded-sm"
            style={{ background: copy.dot }}
          />
          <h3 className="text-sm font-semibold text-white">{copy.title}</h3>
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

      <p className="px-4 pt-3 text-[11px] text-white/40">{copy.blurb}</p>

      <div className="max-h-[420px] overflow-auto p-1">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-black/85 backdrop-blur">
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wide text-white/40">
              <th className="w-10 py-2 pl-3 pr-2 text-center font-medium">#</th>
              <th className="py-2 pr-3 font-medium">User</th>
              <th className="py-2 pr-3 text-right font-medium">Volume</th>
              <th className="py-2 pr-3 text-right font-medium">Trades</th>
              {kind === "bot" ? (
                <>
                  <th className="py-2 pr-3 text-right font-medium">Bots</th>
                  <th className="py-2 pr-3 text-right font-medium">PnL</th>
                </>
              ) : null}
              <th className="py-2 pr-4 text-right font-medium">Last trade</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} bot={kind === "bot"} />
              ))
            ) : error ? (
              <tr>
                <td
                  colSpan={kind === "bot" ? 7 : 5}
                  className="px-4 py-8 text-center text-sm text-red-400/80"
                >
                  Couldn&apos;t load traders ({error}).
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={kind === "bot" ? 7 : 5}
                  className="px-4 py-8 text-center text-sm text-white/50"
                >
                  {search ? "No users match that search." : "No traders yet."}
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
                  {kind === "bot" ? (
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
                  <td className="py-2.5 pr-4 text-right font-mono text-[11px] whitespace-nowrap text-white/45">
                    {fmtWhen(r.lastTradeAt)}
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
      <td className="py-2.5 pr-4 text-right">
        <Skeleton className="ml-auto h-3 w-12" />
      </td>
    </tr>
  );
}
