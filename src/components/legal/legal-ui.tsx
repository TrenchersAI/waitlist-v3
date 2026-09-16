import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/src/lib/utils";
import { SUPPORT_EMAIL } from "@/src/lib/site-metadata";

export const LINK_CLASS =
  "text-[#8B93FF] underline-offset-2 transition-colors hover:text-[#A8AEFF] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30";

/** Body copy for legal pages. Matches the long-form rhythm of /delete-account. */
export const PROSE_CLASS =
  "text-[16px] leading-[1.7] text-white/65 md:text-[17px] [&_strong]:font-semibold [&_strong]:text-white";

/** Small label above a group of rows inside a subsection. */
export function GroupHeading({ children }: { children: ReactNode }) {
  return (
    <h4 className="-mb-1 pt-3 text-[12px] font-semibold tracking-[0.14em] text-white/55 uppercase">
      {children}
    </h4>
  );
}

export function EmailLink() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className={LINK_CLASS}>
      {SUPPORT_EMAIL}
    </a>
  );
}

/**
 * A term counsel still has to settle — governing law, arbitration forum,
 * liability cap. Deliberately loud: a value left like this must not ship.
 */
export function ToBeConfirmed({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-[5px] border border-amber-300/30 bg-amber-300/10 px-1.5 py-px text-[0.9em] font-medium text-amber-200">
      [{children}]
    </span>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[5px] bg-white/7 px-1.5 py-px font-mono text-[0.84em] text-white/85 [overflow-wrap:anywhere]">
      {children}
    </code>
  );
}

export function List({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn("list-disc space-y-3 pl-5 marker:text-white/30", className)}
    >
      {children}
    </ul>
  );
}

/** A list whose bullets are icons: what deletion does, what we never collect. */
export function IconList({
  icon: Icon,
  iconClassName,
  items,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  items: readonly ReactNode[];
}) {
  return (
    <ul className="space-y-3.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <Icon
            aria-hidden
            strokeWidth={2.25}
            className={cn(
              "mt-[5px] size-4 shrink-0 text-white/45 md:mt-1.5",
              iconClassName,
            )}
          />
          <div className="min-w-0">{item}</div>
        </li>
      ))}
    </ul>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/8 bg-white/2 p-5 sm:p-6",
        className,
      )}
    >
      {title ? (
        <h4 className="mb-4 text-[12px] font-semibold tracking-[0.14em] text-white/55 uppercase">
          {title}
        </h4>
      ) : null}
      {children}
    </div>
  );
}

const TONES = {
  neutral: {
    box: "border-white/10 bg-white/3",
    icon: "text-white/60",
    chip: "border-white/10 bg-white/5 text-white/70",
  },
  accent: {
    box: "border-[#8B93FF]/25 bg-[#8B93FF]/6",
    icon: "text-[#8B93FF]",
    chip: "border-[#8B93FF]/25 bg-[#8B93FF]/10 text-[#A8AEFF]",
  },
  /** Protections we give you. */
  protect: {
    box: "border-emerald-300/20 bg-emerald-300/5",
    icon: "text-emerald-300",
    chip: "border-emerald-300/20 bg-emerald-300/8 text-emerald-300",
  },
  /** Things you should know before you rely on the product. */
  caution: {
    box: "border-amber-300/20 bg-amber-300/5",
    icon: "text-amber-300",
    chip: "border-amber-300/20 bg-amber-300/8 text-amber-300",
  },
} as const;

type Tone = keyof typeof TONES;

export function Callout({
  tone = "neutral",
  icon: Icon,
  title,
  children,
}: {
  tone?: Tone;
  icon: LucideIcon;
  title?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3.5 rounded-xl border px-4 py-4 sm:gap-4 sm:px-5",
        TONES[tone].box,
      )}
    >
      <Icon
        aria-hidden
        strokeWidth={2}
        className={cn("mt-[3px] size-[18px] shrink-0 md:mt-1", TONES[tone].icon)}
      />
      <div className="min-w-0 space-y-2 text-[15px] leading-[1.65] text-white/70 md:text-[16px]">
        {title ? <p className="font-semibold text-white">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function CardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2", className)}>{children}</ul>
  );
}

export function Card({
  icon: Icon,
  tone = "neutral",
  title,
  children,
  className,
}: {
  icon?: LucideIcon;
  tone?: Tone;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "flex flex-col rounded-xl border border-white/8 bg-white/2 p-5",
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "mb-4 inline-flex size-9 items-center justify-center rounded-lg border",
            TONES[tone].chip,
          )}
        >
          <Icon aria-hidden strokeWidth={1.75} className="size-[18px]" />
        </span>
      ) : null}
      <p className="text-[16px] font-semibold leading-[1.35] text-white">
        {title}
      </p>
      <div className="mt-2 text-[15px] leading-[1.6] text-white/60">
        {children}
      </div>
    </li>
  );
}

const RECORD_GRID: Record<number, string> = {
  2: "md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]",
  3: "md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,1fr)]",
};

/**
 * The policy's tables, as a definition list: a real grid from `md` up, and
 * stacked rows on phones where a three-column table would need to scroll.
 * The first column is the term; the others carry their column name inline on
 * phones (and always for screen readers, since the header row is decorative).
 */
export function RecordTable({
  columns,
  rows,
  grid,
  showHeader = true,
}: {
  columns: readonly string[];
  rows: readonly (readonly ReactNode[])[];
  /** `md:grid-cols-[…]` template, when the default split does not fit. */
  grid?: string;
  showHeader?: boolean;
}) {
  const template = grid ?? RECORD_GRID[columns.length];
  const labelCells = columns.length > 2;

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.015]">
      {showHeader ? (
        <div
          aria-hidden
          className={cn(
            "hidden gap-6 border-b border-white/8 bg-white/3 px-5 py-2.5 text-[11px] font-semibold tracking-[0.12em] text-white/50 uppercase md:grid",
            template,
          )}
        >
          {columns.map((column) => (
            <span key={column}>{column}</span>
          ))}
        </div>
      ) : null}
      <dl className="divide-y divide-white/6">
        {rows.map(([term, ...values], rowIndex) => (
          <div
            key={rowIndex}
            className={cn(
              "grid px-4 py-4 sm:px-5 md:gap-6",
              labelCells ? "gap-3" : "gap-1.5",
              template,
            )}
          >
            <dt className="text-[15px] font-medium leading-[1.55] text-white">
              {term}
            </dt>
            {values.map((value, cellIndex) => (
              <dd
                key={cellIndex}
                className="text-[15px] leading-[1.65] text-white/65"
              >
                {labelCells ? (
                  <span className="mb-0.5 block text-[11px] font-semibold tracking-[0.12em] text-white/45 uppercase md:sr-only">
                    {columns[cellIndex + 1]}
                  </span>
                ) : null}
                {value}
              </dd>
            ))}
          </div>
        ))}
      </dl>
    </div>
  );
}
