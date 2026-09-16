import type { ReactNode } from "react";

import { cn } from "@/src/lib/utils";

import type { LegalOutline } from "./legal-outline";
import { LINK_CLASS } from "./legal-ui";

/** Clears the fixed site nav (and the phone section bar) after an anchor jump. */
const ANCHOR_OFFSET_CLASS = "scroll-mt-36 lg:scroll-mt-24";

function HeadingLink({ id, children }: { id: string; children: ReactNode }) {
  return (
    <a
      href={`#${id}`}
      className="group/anchor relative rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      <span
        aria-hidden
        className="absolute top-0 -left-6 hidden select-none text-white/25 opacity-0 transition-opacity duration-150 group-hover/anchor:opacity-100 group-focus-visible/anchor:opacity-100 md:inline"
      >
        #
      </span>
      {children}
    </a>
  );
}

/**
 * Heading components bound to one document's outline, so `<Section number="7">`
 * and `<Ref to="7.1" />` only accept numbers that document actually has.
 */
export function createLegalSections<N extends string>(outline: LegalOutline<N>) {
  function Section({
    number,
    children,
  }: {
    number: N;
    children: ReactNode;
  }) {
    const { id, title } = outline.get(number);

    return (
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className={ANCHOR_OFFSET_CLASS}
      >
        <div aria-hidden className="flex items-center gap-4">
          <span className="font-mono text-[12px] font-medium tracking-[0.08em] text-[#8B93FF] tabular-nums">
            {number.padStart(2, "0")}
          </span>
          <span className="h-px flex-1 bg-white/8" />
        </div>
        <h2
          id={`${id}-title`}
          className="mt-5 text-balance text-[26px] font-semibold leading-[1.18] tracking-[-0.02em] text-white sm:text-[30px]"
        >
          <HeadingLink id={id}>
            <span className="sr-only">{number}. </span>
            {title}
          </HeadingLink>
        </h2>
        <div className="mt-6 space-y-5">{children}</div>
      </section>
    );
  }

  function Subsection({ number, children }: { number: N; children: ReactNode }) {
    const { id, title } = outline.get(number);

    return (
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className={cn(ANCHOR_OFFSET_CLASS, "pt-6 first:pt-0")}
      >
        <h3
          id={`${id}-title`}
          className="text-balance text-[20px] font-semibold leading-[1.3] tracking-[-0.015em] text-white sm:text-[22px]"
        >
          <HeadingLink id={id}>
            <span className="mr-2.5 font-mono text-[14px] font-medium tracking-normal text-white/45 tabular-nums sm:text-[15px]">
              {number}
            </span>
            {title}
          </HeadingLink>
        </h3>
        <div className="mt-4 space-y-5">{children}</div>
      </section>
    );
  }

  /** "§5" cross-reference. The section title rides along for screen readers. */
  function Ref({ to }: { to: N }) {
    const { id, title } = outline.get(to);

    return (
      <a href={`#${id}`} className={cn(LINK_CLASS, "whitespace-nowrap")}>
        §{to}
        <span className="sr-only"> ({title})</span>
      </a>
    );
  }

  return { Section, Subsection, Ref };
}
