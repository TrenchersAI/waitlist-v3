"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/src/lib/utils";
import { SUPPORT_EMAIL } from "@/src/lib/site-metadata";

import type { LegalSection } from "./legal-outline";

/** A section becomes current once its top edge rises within this many pixels
   of the viewport top: below the fixed nav and the phone section bar, and
   past where an anchor jump lands a heading (`scroll-mt-36`). */
const ACTIVATION_OFFSET = 150;

type TocProps = {
  sections: LegalSection[];
  /** Element wrapping the numbered sections, for reading progress. */
  bodyId: string;
  /** Names the document in the landmark label: "Privacy Policy sections". */
  label: string;
};

/** Tracks the section being read and, when given a bar, paints reading
   progress straight onto it so scrolling never re-renders the tree. */
function useCurrentSection(
  sections: LegalSection[],
  bodyId: string,
  progressRef?: RefObject<HTMLElement | null>,
) {
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    const elements = sections.map(({ id }) => document.getElementById(id));
    const body = document.getElementById(bodyId);
    let frame = 0;

    const measure = () => {
      frame = 0;

      let current: string | null = null;
      for (const section of elements) {
        if (!section) continue;
        if (section.getBoundingClientRect().top > ACTIVATION_OFFSET) break;
        current = section.id;
      }
      setCurrentId(current);

      const bar = progressRef?.current;
      if (bar && body) {
        const { top, height } = body.getBoundingClientRect();
        const readable = height - (window.innerHeight - ACTIVATION_OFFSET);
        const progress =
          readable > 0 ? (ACTIVATION_OFFSET - top) / readable : 1;
        bar.style.transform = `scaleX(${Math.min(Math.max(progress, 0), 1)})`;
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [sections, bodyId, progressRef]);

  return currentId;
}

/** Sticky contents rail beside the document on large screens. */
export function LegalTocDesktop({ sections, bodyId, label }: TocProps) {
  const currentId = useCurrentSection(sections, bodyId);

  return (
    <nav aria-label={`${label} sections`} className="hidden lg:block">
      <div className="scrollbar-minimal-black sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain pb-8">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-white/45 uppercase">
          On this page
        </p>
        <ol className="mt-4 border-l border-white/8">
          {sections.map(({ id, number, title }) => {
            const isCurrent = id === currentId;

            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={isCurrent ? "location" : undefined}
                  className={cn(
                    "-ml-px flex gap-3 border-l py-[7px] pr-2 pl-4 text-[13px] leading-[1.45] outline-none transition-colors duration-150 focus-visible:rounded-r-sm focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-inset",
                    isCurrent
                      ? "border-[#8B93FF] text-white"
                      : "border-transparent text-white/55 hover:border-white/30 hover:text-white/90",
                  )}
                >
                  <span
                    className={cn(
                      "w-4 shrink-0 text-right font-mono text-[11px] leading-[19px] tabular-nums transition-colors duration-150",
                      isCurrent ? "text-[#8B93FF]" : "text-white/40",
                    )}
                  >
                    {number}
                  </span>
                  <span>{title}</span>
                </a>
              </li>
            );
          })}
        </ol>
        <p className="mt-6 border-t border-white/8 pt-4 text-[12px] leading-[1.6] text-white/50">
          Questions?
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-0.5 block text-[#8B93FF] underline-offset-2 transition-colors hover:text-[#A8AEFF] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </nav>
  );
}

/** Phone and tablet: a bar that sticks under the site nav, names the section
   being read, and opens the full contents list. */
export function LegalTocMobile({ sections, bodyId, label }: TocProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const currentId = useCurrentSection(sections, bodyId, progressRef);
  const current = sections.find(({ id }) => id === currentId);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="sticky top-16 z-40 mt-10 lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="legal-contents"
        onClick={() => setOpen((value) => !value)}
        className="relative flex min-h-12 w-full items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#0f1010]/90 px-4 text-left shadow-lg shadow-black/40 backdrop-blur-md transition-colors duration-150 outline-none hover:border-white/20 focus-visible:ring-2 focus-visible:ring-white/30"
      >
        <span className="w-5 shrink-0 font-mono text-[12px] text-[#8B93FF] tabular-nums">
          {current ? current.number.padStart(2, "0") : "§"}
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-white">
          {current ? current.title : "On this page"}
        </span>
        <span className="shrink-0 text-[12px] text-white/45 tabular-nums">
          {current
            ? `${current.number}/${sections.length}`
            : `${sections.length} sections`}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-white/55 transition-transform duration-200 ease-out",
            open && "rotate-180",
          )}
        />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-white/6">
          <span
            ref={progressRef}
            className="block h-full origin-left bg-[#8B93FF]/70 [transform:scaleX(0)]"
          />
        </span>
      </button>

      <nav
        id="legal-contents"
        aria-label={`${label} sections`}
        hidden={!open}
        className="absolute inset-x-0 top-full mt-2 max-h-[min(65dvh,30rem)] overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#0f1010]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-md"
      >
        <ol>
          {sections.map(({ id, number, title }) => {
            const isCurrent = id === currentId;

            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={isCurrent ? "location" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-[14px] leading-[1.4] outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-inset",
                    isCurrent
                      ? "bg-white/8 text-white"
                      : "text-white/65 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "w-5 shrink-0 font-mono text-[12px] tabular-nums",
                      isCurrent ? "text-[#8B93FF]" : "text-white/40",
                    )}
                  >
                    {number.padStart(2, "0")}
                  </span>
                  {title}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
