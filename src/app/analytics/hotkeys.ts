"use client";

/** UTC-day range (inclusive). Strings are YYYY-MM-DD so they match what the
   analytics API parser expects. */
export type DateRange = { from: string; to: string };

export type RangeKey =
  | "today"
  | "last1"
  | "last2"
  | "last3"
  | "last7"
  | "last30"
  | "last90"
  | "all";

export type NavTarget = "overview" | "trends" | "referrals" | "signups";

export type HotkeyAction =
  | { kind: "range"; key: RangeKey; label: string; range: DateRange }
  | { kind: "nav"; target: NavTarget; label: string }
  | { kind: "refetch"; label: "Refresh" }
  | { kind: "export"; label: "Export CSV" }
  | { kind: "focus-search"; label: "Search" };

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function utcMinusDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Resolves a range key to concrete UTC YYYY-MM-DD strings. `last1` is "today
   only" — we keep it as a separate key for the hotkey UX, but mathematically
   it equals today. */
export function rangeForKey(key: RangeKey): DateRange {
  const today = utcToday();
  switch (key) {
    case "today":
    case "last1":
      return { from: today, to: today };
    case "last2":
      return { from: utcMinusDays(1), to: today };
    case "last3":
      return { from: utcMinusDays(2), to: today };
    case "last7":
      return { from: utcMinusDays(6), to: today };
    case "last30":
      return { from: utcMinusDays(29), to: today };
    case "last90":
      return { from: utcMinusDays(89), to: today };
    case "all":
      return { from: "2020-01-01", to: today };
  }
}

/** Days the range covers (inclusive). Used to size the "prior period" delta
   so it compares apples-to-apples. */
export function rangeLengthDays(range: DateRange): number {
  const a = Date.UTC(
    +range.from.slice(0, 4),
    +range.from.slice(5, 7) - 1,
    +range.from.slice(8, 10),
  );
  const b = Date.UTC(
    +range.to.slice(0, 4),
    +range.to.slice(5, 7) - 1,
    +range.to.slice(8, 10),
  );
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

/** Equal-length window immediately before `range`. Used for delta vs prior
   period. Returns null for all-time (no meaningful prior). */
export function priorRange(range: DateRange, key: RangeKey): DateRange | null {
  if (key === "all") return null;
  const len = rangeLengthDays(range);
  const fromDate = new Date(`${range.from}T00:00:00.000Z`);
  const priorToDate = new Date(fromDate);
  priorToDate.setUTCDate(priorToDate.getUTCDate() - 1);
  const priorFromDate = new Date(priorToDate);
  priorFromDate.setUTCDate(priorFromDate.getUTCDate() - (len - 1));
  return {
    from: priorFromDate.toISOString().slice(0, 10),
    to: priorToDate.toISOString().slice(0, 10),
  };
}

const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Today",
  last1: "Today",
  last2: "Last 2 days",
  last3: "Last 3 days",
  last7: "Last 7 days",
  last30: "Last 30 days",
  last90: "Last 90 days",
  all: "All-time",
};

export function rangeLabel(key: RangeKey): string {
  return RANGE_LABEL[key];
}

export type HotkeyState = { gPending: boolean };

export function newHotkeyState(): HotkeyState {
  return { gPending: false };
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  ) {
    return true;
  }
  return false;
}

/** Pure parser: given the current state + event, returns the action to fire
   (or null) and the next state. No side effects — caller dispatches. */
export function parseHotkey(
  event: KeyboardEvent,
  state: HotkeyState,
): { action: HotkeyAction | null; next: HotkeyState } {
  // Escape clears any in-progress prefix and does nothing else.
  if (event.key === "Escape") {
    return { action: null, next: { gPending: false } };
  }

  // Bail on modifier combos and editable targets.
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return { action: null, next: state };
  }
  if (isEditable(event.target)) {
    return { action: null, next: state };
  }

  if (event.key === "/") {
    return {
      action: { kind: "focus-search", label: "Search" },
      next: { gPending: false },
    };
  }

  const key = event.key.toLowerCase();

  // Vim-style `g` then letter.
  if (state.gPending) {
    const target: NavTarget | null =
      key === "o"
        ? "overview"
        : key === "t"
          ? "trends"
          : key === "r"
            ? "referrals"
            : key === "s"
              ? "signups"
              : null;
    if (target) {
      return {
        action: { kind: "nav", target, label: `Go: ${target}` },
        next: { gPending: false },
      };
    }
    // Unknown follow-up clears the prefix.
    return { action: null, next: { gPending: false } };
  }

  if (key === "g") {
    return { action: null, next: { gPending: true } };
  }

  // Single-key range scopes.
  const rangeKey: RangeKey | null =
    key === "1"
      ? "last1"
      : key === "2"
        ? "last2"
        : key === "3"
          ? "last3"
          : key === "w"
            ? "last7"
            : key === "m"
              ? "last30"
              : key === "q"
                ? "last90"
                : key === "a"
                  ? "all"
                  : key === "t"
                    ? "today"
                    : null;
  if (rangeKey) {
    const range = rangeForKey(rangeKey);
    return {
      action: {
        kind: "range",
        key: rangeKey,
        label: `Range: ${rangeLabel(rangeKey)}`,
        range,
      },
      next: { gPending: false },
    };
  }

  if (key === "r") {
    return {
      action: { kind: "refetch", label: "Refresh" },
      next: { gPending: false },
    };
  }
  if (key === "e") {
    return {
      action: { kind: "export", label: "Export CSV" },
      next: { gPending: false },
    };
  }

  return { action: null, next: state };
}
