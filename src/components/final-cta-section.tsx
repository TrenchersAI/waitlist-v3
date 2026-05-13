"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BorderBeam } from "border-beam";
import { useReducedMotion } from "motion/react";

export default function FinalCtaSection() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  if (pathname === "/analytics" || pathname?.startsWith("/analytics/")) {
    return null;
  }

  return (
    <section
      className="site-canvas-bg relative w-full border-t border-white/6"
      aria-labelledby="final-cta-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 md:px-8 md:py-20 lg:py-24">
        <span className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-white/45 uppercase">
          <span aria-hidden className="h-px w-6 bg-white/15" />
          Early access
        </span>
        <h2
          id="final-cta-heading"
          className="mt-5 text-balance text-[28px] font-medium leading-[1.1] tracking-[-0.02em] text-white sm:text-[36px] md:text-[40px]"
        >
          Join the vibe trenchers.
        </h2>
        <p className="mx-auto mt-4 max-w-[52ch] text-balance text-[15px] leading-[1.65] text-white/60 md:text-[16px]">
          Join the waitlist for TrenchersAI—one terminal to discover, snipe,
          copy, track, and manage positions with AI agents built for speed.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <BorderBeam
            size="line"
            theme="dark"
            colorVariant="ocean"
            duration={2.4}
            strength={0.62}
            borderRadius={9999}
            active={!prefersReducedMotion}
            className="shrink-0"
          >
            <Link
              href="/#waitlist"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-black px-6 py-2.5 text-[13px] font-semibold text-white outline-none transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
            >
              Get early access
            </Link>
          </BorderBeam>
        </div>
        <div className="relative mx-auto mt-8 w-full max-w-[1100px] md:mt-10">
          <Image
            src="/agent.svg"
            alt="AI agents across sniping, execution, wallets, and rewards"
            width={1372}
            height={672}
            sizes="(min-width: 1280px) 1100px, 100vw"
            className="h-auto w-full"
            unoptimized
          />
        </div>
      </div>
    </section>
  );
}
