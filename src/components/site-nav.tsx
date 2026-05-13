"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BorderBeam } from "border-beam";
import { useReducedMotion } from "motion/react";

import logoMark from "./icons/logo-mark.svg";

/** Sticky glass nav — marketing chrome on public pages; minimal chrome on `/analytics`. */
export default function SiteNav() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const isAnalytics =
    pathname === "/analytics" || pathname?.startsWith("/analytics/");

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/6 bg-black/55 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-white outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <Image
            src={logoMark}
            alt="TrenchersAI logo"
            width={26}
            height={23}
            className="h-[23px] w-[26px]"
            priority
          />
          <span className="text-[15px] font-medium tracking-wide">
            TrenchersAI
          </span>
        </Link>

        {isAnalytics ? (
          <Link
            href="/"
            className="rounded-full px-3 py-1.5 text-[13px] font-medium text-white/65 transition-colors hover:bg-white/10 hover:text-white"
          >
            ← Marketing site
          </Link>
        ) : (
          <div className="flex items-center gap-1.5">
            <Link
              href="/about-us"
              className="hidden rounded-full px-3 py-1.5 text-[13px] font-medium text-white/60 transition-colors hover:text-white sm:inline-flex"
            >
              About
            </Link>
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
                className="inline-flex items-center rounded-full border border-white/15 bg-black px-3.5 py-1.5 text-[12.5px] font-semibold text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/35"
              >
                Join Early Access
              </Link>
            </BorderBeam>
          </div>
        )}
      </nav>
    </header>
  );
}
