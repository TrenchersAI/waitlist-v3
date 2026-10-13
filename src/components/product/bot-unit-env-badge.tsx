import clsx from "clsx";

/** Simulated-trading pill — available for non-card surfaces; fleet cards use
 *  Add balance in the footer for Paper (no Paper chip). */
export function BotUnitPaperBadge({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "shrink-0 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-yellow-300",
        className,
      )}
    >
      Paper
    </span>
  );
}

/** Real-SOL trading pill — brand accent, matches Live empty-state badge. */
export function BotUnitLiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide",
        className,
      )}
      style={{
        color: "var(--color-accent-highlight)",
        backgroundColor:
          "color-mix(in srgb, var(--color-accent) 14%, transparent)",
        borderColor: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
      }}
    >
      <span style={{ color: "var(--color-accent)" }} aria-hidden>
        ●
      </span>
      Live
    </span>
  );
}
