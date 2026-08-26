"use client";

// =============================================================================
// analytics-pagination - one pager for every long list on the analytics page
// =============================================================================
//
// Extracted from the survey view's long-form answers card, which was the first
// list here big enough to need paging. Any table that grows with users or sends
// should use this rather than growing its own copy: two pagers drift, and the
// off-by-one bugs they drift into are invisible until someone is on page 7.
//
// The one subtle rule, kept from the original: the current page is CLAMPED
// DURING RENDER rather than corrected by a setState effect. When rows load late
// or the page size shrinks (jumping off what used to be the last page), the
// stored page can fall out of range for a frame. Deriving the safe page keeps
// the view correct without an extra render pass, and without tripping
// react-hooks/set-state-in-effect.

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

export const DEFAULT_PAGE_SIZES = [25, 50, 100] as const;

/**
 * Compact page-number strip with ellipses: always first + last, plus a window
 * around the current page. Values are 0-indexed; "…" marks a gap.
 * e.g. [0, "…", 4, 5, 6, "…", 20].
 */
export function pageStrip(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const nums = new Set<number>([0, total - 1, current]);
  for (let d = 1; d <= 1; d++) {
    if (current - d >= 0) nums.add(current - d);
    if (current + d <= total - 1) nums.add(current + d);
  }
  const sorted = [...nums].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = -1;
  for (const n of sorted) {
    if (prev >= 0 && n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

export function PagerButton({
  children,
  onClick,
  disabled,
  active,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      className={
        "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[12px] tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-35 " +
        (active
          ? "border-white/25 bg-white/15 font-semibold text-white"
          : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white")
      }
    >
      {children}
    </button>
  );
}

export type Pagination<T> = {
  page: number;
  pageSize: number;
  setPageSize: (n: number) => void;
  totalPages: number;
  total: number;
  /** The current page's slice. */
  visible: T[];
  goTo: (next: number) => void;
  /** 1-indexed inclusive range currently shown, for "showing X to Y of Z". */
  rangeStart: number;
  rangeEnd: number;
};

/**
 * Scroll-to-top-of-list on page change, kept deliberately OUT of
 * `usePagination`'s return value. A ref carried inside a returned object counts
 * as accessing a ref during render (react-hooks/refs) at every property read of
 * that object. Attaching a ref directly in JSX, which is what this returns, is
 * the ordinary supported pattern.
 */
export function usePagerAnchor(page: number) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const firstRender = useRef(true);

  // Skipped on first paint so the page is not yanked on load.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    anchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  return anchorRef;
}

export function usePagination<T>(
  rows: T[] | null,
  initialSize: number = DEFAULT_PAGE_SIZES[0],
): Pagination<T> {
  const [pageSize, setPageSizeRaw] = useState<number>(initialSize);
  const [rawPage, setRawPage] = useState(0);

  const total = rows?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(rawPage, totalPages - 1);
  const start = page * pageSize;

  const visible = useMemo(
    () => (rows ? rows.slice(start, start + pageSize) : []),
    [rows, start, pageSize],
  );

  return {
    page,
    pageSize,
    setPageSize: (n: number) => {
      setPageSizeRaw(n);
      setRawPage(0);
    },
    totalPages,
    total,
    visible,
    goTo: (next: number) =>
      setRawPage(Math.max(0, Math.min(next, totalPages - 1))),
    rangeStart: total === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, total),
  };
}

/** Per-page selector. Render it in the list header. */
export function PageSizeSelect({
  value,
  onChange,
  sizes = DEFAULT_PAGE_SIZES,
}: {
  value: number;
  onChange: (n: number) => void;
  sizes?: readonly number[];
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-white/45">
      Per page
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 rounded-lg border border-white/12 bg-white/[0.04] px-2 text-[12px] text-white/85 outline-none focus:border-white/25"
      >
        {sizes.map((s) => (
          <option key={s} value={s} className="bg-neutral-900">
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The full pager nav. Renders nothing when everything fits on one page. */
export function Pager<T>({
  p,
  label,
}: {
  p: Pagination<T>;
  label: string;
}) {
  if (p.totalPages <= 1) return null;
  return (
    <nav
      aria-label={label}
      className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] px-6 pt-4 sm:flex-row"
    >
      <p className="order-2 text-[11px] tabular-nums text-white/40 sm:order-1">
        Showing{" "}
        <span className="text-white/70">
          {p.rangeStart.toLocaleString()}-{p.rangeEnd.toLocaleString()}
        </span>{" "}
        of <span className="text-white/70">{p.total.toLocaleString()}</span>
      </p>
      <div className="order-1 flex items-center gap-1.5 sm:order-2">
        <PagerButton
          onClick={() => p.goTo(0)}
          disabled={p.page === 0}
          ariaLabel="First page"
        >
          «
        </PagerButton>
        <PagerButton
          onClick={() => p.goTo(p.page - 1)}
          disabled={p.page === 0}
          ariaLabel="Previous page"
        >
          ‹
        </PagerButton>
        {pageStrip(p.page, p.totalPages).map((n, i) =>
          n === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-[12px] text-white/30">
              …
            </span>
          ) : (
            <PagerButton
              key={n}
              onClick={() => p.goTo(n)}
              active={n === p.page}
              ariaLabel={`Page ${n + 1}`}
            >
              {n + 1}
            </PagerButton>
          ),
        )}
        <PagerButton
          onClick={() => p.goTo(p.page + 1)}
          disabled={p.page >= p.totalPages - 1}
          ariaLabel="Next page"
        >
          ›
        </PagerButton>
        <PagerButton
          onClick={() => p.goTo(p.totalPages - 1)}
          disabled={p.page >= p.totalPages - 1}
          ariaLabel="Last page"
        >
          »
        </PagerButton>
      </div>
    </nav>
  );
}
