"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Sparkles, UserRoundCheck, X } from "lucide-react";

import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";
import { deskProfileUrl } from "@/src/lib/ops-desk";

// One recipient on one day, mirrored from `trenchers-paper-grants.ts`.
export type PaperGrantRecipient = {
  userId: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  wallet: string | null;
  sol: number;
  grants: number;
  autoGrants: number;
  approvedBy: string[];
  note: string | null;
  lastAt: string | null;
  lifetimeGrants: number;
  lifetimeSol: number;
};

type RecipientsPayload = {
  floor: string;
  date: string;
  recipients: PaperGrantRecipient[];
};

// Same two colours the chart stacks with (auto = indigo, operator = teal), so
// a row's type badge reads as the segment it belongs to.
export const AUTO_COLOR = "#818cf8";
export const OPERATOR_COLOR = "#2dd4bf";

// Module-level cache keyed by day so re-opening a day doesn't re-hit the
// endpoint within a session. Mirrors `traders-panel.tsx`.
const cacheByDate = new Map<string, RecipientsPayload>();

function loadForDate(date: string): Promise<RecipientsPayload> {
  const cached = cacheByDate.get(date);
  if (cached) return Promise.resolve(cached);
  return fetch(
    `/api/analytics/paper-grants/recipients?date=${encodeURIComponent(date)}`,
    { cache: "no-store" },
  )
    .then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as RecipientsPayload;
    })
    .then((p) => {
      cacheByDate.set(date, p);
      return p;
    });
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

/** Time-of-day (UTC) — the day is already in the header. */
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

/** Label for a recipient: username → display name → email → short wallet →
 *  short id. Never blank, so every row is identifiable. */
function recipientLabel(r: PaperGrantRecipient): string {
  if (r.username) return r.username;
  if (r.displayName) return r.displayName;
  if (r.email) return r.email;
  if (r.wallet) return shortWallet(r.wallet);
  return `${r.userId.slice(0, 8)}…`;
}

/** Secondary line under the name: wallet if we have one, else the email. */
function recipientSub(r: PaperGrantRecipient): string | null {
  if (r.wallet) return shortWallet(r.wallet);
  if (r.email && r.email !== recipientLabel(r)) return r.email;
  return null;
}

function recipientInitial(r: PaperGrantRecipient): string {
  const ch = recipientLabel(r).trim()[0];
  return ch ? ch.toUpperCase() : "?";
}

/** "1st" / "2nd" / "3rd" / "4th" … */
function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** Operator email → the part before the @, so a column of
 *  `name@trenchers.ai` reads as names. */
function operatorHandle(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

export function PaperGrantsPanel({
  date,
  onClose,
}: {
  /** The UTC day (YYYY-MM-DD) picked on the chart. */
  date: string;
  /** Close the drill-down. */
  onClose: () => void;
}) {
  const [payload, setPayload] = useState<RecipientsPayload | null>(
    cacheByDate.get(date) ?? null,
  );
  const [loading, setLoading] = useState(!cacheByDate.has(date));
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // `loading` starts `true` on a cache miss, so no synchronous setState here.
  useEffect(() => {
    let cancelled = false;
    loadForDate(date)
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
  }, [date]);

  const rows = payload?.recipients;
  // Prefer the day the server actually returned; falls back to the requested
  // day while loading, so the header can never label a day the rows don't
  // belong to.
  const shownDate = payload?.date ?? date;

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.username?.toLowerCase().includes(q) ||
        r.displayName?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.wallet?.toLowerCase().includes(q) ||
        r.userId.toLowerCase().includes(q) ||
        r.approvedBy.some((a) => a.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const summary = useMemo(() => {
    if (!rows) return null;
    const sol = rows.reduce((a, r) => a + r.sol, 0);
    const grants = rows.reduce((a, r) => a + r.grants, 0);
    const firstTimers = rows.filter((r) => r.autoGrants > 0).length;
    return { sol, grants, firstTimers };
  }, [rows]);

  return (
    <div className="rounded-xl border border-white/10 bg-black/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden
            className="size-2 rounded-sm"
            style={{
              background: `linear-gradient(135deg, ${AUTO_COLOR} 50%, ${OPERATOR_COLOR} 50%)`,
            }}
          />
          <h3 className="text-sm font-semibold text-white">Paper SOL recipients</h3>
          <span className="text-xs text-white/45">· {fmtDayLabel(shownDate)}</span>
          {summary ? (
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium tabular-nums text-white/55">
              {fmtInt(rows?.length ?? 0)} users · {fmtInt(summary.grants)}{" "}
              {summary.grants === 1 ? "grant" : "grants"} · ◎{fmtSol(summary.sol)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user / wallet / approver…"
            className="h-8 w-52 rounded-lg border border-white/12 bg-black/35 px-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-white/35 focus:ring-2 focus:ring-white/15"
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
        Users whose paper top-up was approved on{" "}
        <span className="text-white/60">{fmtDayLabel(shownDate)}</span> (UTC),
        ranked by SOL received.
        {summary && summary.firstTimers > 0 ? (
          <>
            {" "}
            <span className="text-white/55">
              {fmtInt(summary.firstTimers)}{" "}
              {summary.firstTimers === 1 ? "was" : "were"} first-time
              requesters (auto-approved).
            </span>
          </>
        ) : null}
      </p>

      <div className="max-h-[420px] overflow-auto p-1">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-black/85 backdrop-blur">
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wide text-white/40">
              <th className="w-10 py-2 pl-3 pr-2 text-center font-medium">#</th>
              <th className="py-2 pr-3 font-medium">User</th>
              <th className="py-2 pr-3 text-right font-medium">Received</th>
              <th className="py-2 pr-3 text-right font-medium">Top-up</th>
              <th className="py-2 pr-3 font-medium">Approved</th>
              <th className="py-2 pr-3 text-right font-medium">Lifetime</th>
              <th className="py-2 pr-3 text-right font-medium">Time (UTC)</th>
              <th className="w-10 py-2 pr-3 text-right font-medium">
                <span className="sr-only">Open in Trench Desk</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : error ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-red-400/80"
                >
                  Couldn&apos;t load recipients ({error}).
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-white/50"
                >
                  {search
                    ? "No users match that search."
                    : "No paper SOL handed out on this day."}
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => {
                const auto = r.autoGrants > 0;
                const sub = recipientSub(r);
                // Lifetime index of the LAST grant that day: with N grants
                // through this day, the day's grants span (N-grants+1 … N).
                const nth = r.lifetimeGrants;
                return (
                  <tr
                    key={r.userId}
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
                          {recipientInitial(r)}
                        </div>
                        <div className="min-w-0">
                          <div
                            className="truncate text-[13px] font-medium text-white/90"
                            title={r.userId}
                          >
                            {recipientLabel(r)}
                          </div>
                          {sub ? (
                            <div
                              className="truncate font-mono text-[10.5px] text-white/35"
                              title={r.wallet ?? r.email ?? undefined}
                            >
                              {sub}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-[12.5px] tabular-nums text-white/90">
                      ◎{fmtSol(r.sol)}
                      {r.grants > 1 ? (
                        <span className="ml-1 text-[10px] text-white/35">
                          ×{r.grants}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums",
                          nth === 1
                            ? "border-indigo-400/30 bg-indigo-400/10 text-indigo-200"
                            : "border-white/10 bg-white/[0.03] text-white/60",
                        )}
                        title={`${fmtInt(nth)} approved top-up${nth === 1 ? "" : "s"} through this day`}
                      >
                        {ordinal(nth)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className="size-2 shrink-0 rounded-sm"
                          style={{ background: auto ? AUTO_COLOR : OPERATOR_COLOR }}
                        />
                        {auto ? (
                          <span className="inline-flex items-center gap-1 text-[12px] text-white/75">
                            <Sparkles className="size-3 text-indigo-300" aria-hidden />
                            Auto
                            <span className="text-white/40">· first request</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex min-w-0 items-center gap-1 text-[12px] text-white/75"
                            title={r.approvedBy.join(", ") || undefined}
                          >
                            <UserRoundCheck className="size-3 text-teal-300" aria-hidden />
                            <span className="truncate">
                              {r.approvedBy.length > 0
                                ? r.approvedBy.map(operatorHandle).join(", ")
                                : "Operator"}
                            </span>
                          </span>
                        )}
                      </div>
                      {r.note ? (
                        <div
                          className="mt-0.5 max-w-[220px] truncate text-[10.5px] text-white/35"
                          title={r.note}
                        >
                          “{r.note}”
                        </div>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-[11.5px] tabular-nums text-white/55">
                      ◎{fmtSol(r.lifetimeSol)}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-[11px] whitespace-nowrap text-white/45">
                      {fmtClock(r.lastAt)}
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <a
                        href={deskProfileUrl(r.userId)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${recipientLabel(r)} in Trench Desk`}
                        title="Open in Trench Desk"
                        className="inline-flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/55 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                      >
                        <ArrowUpRight className="size-3.5" />
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkeletonRow() {
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
        <Skeleton className="ml-auto h-4 w-8 rounded-md" />
      </td>
      <td className="py-2.5 pr-3">
        <Skeleton className="h-3 w-24" />
      </td>
      <td className="py-2.5 pr-3 text-right">
        <Skeleton className="ml-auto h-3 w-12" />
      </td>
      <td className="py-2.5 pr-3 text-right">
        <Skeleton className="ml-auto h-3 w-12" />
      </td>
      <td className="py-2.5 pr-3 text-right">
        <Skeleton className="ml-auto size-7 rounded-md" />
      </td>
    </tr>
  );
}
