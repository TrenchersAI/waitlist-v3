"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import logoMark from "./icons/logo-mark.svg";

const FOOTER_LINK_CLASS =
  "inline-flex text-[13px] text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/analytics" || pathname?.startsWith("/analytics/")) {
    return null;
  }

  const year = new Date().getFullYear();

  return (
    <footer className="w-full min-w-0 overflow-x-hidden border-t border-white/6 bg-black">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pt-12 pb-0 sm:px-6 md:px-8 md:pt-14">
        <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="min-w-0">
            <Link
              href="/"
              className="flex w-fit items-center gap-2.5 text-white transition-opacity hover:opacity-90"
            >
              <span aria-hidden className="inline-flex shrink-0">
                <Image
                  src={logoMark}
                  alt=""
                  width={30}
                  height={27}
                  className="h-[27px] w-[30px]"
                />
              </span>
              <span className="text-[19px] font-medium tracking-wide">
                Trenchers
              </span>
            </Link>
            <p className="mt-3 max-w-[52ch] text-left text-[13px] leading-[1.6] text-white/50 md:text-[14px]">
              Trading terminal for the trenches.
            </p>
          </div>

          <nav
            className="grid grid-cols-2 gap-x-8 gap-y-2 text-left sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-5"
            aria-label="Footer"
          >
            <Link href="/terms" className={FOOTER_LINK_CLASS}>
              Terms
            </Link>
            <Link href="/privacy" className={FOOTER_LINK_CLASS}>
              Privacy
            </Link>
            <Link href="/about-us" className={FOOTER_LINK_CLASS}>
              About
            </Link>
            <a
              href="https://x.com/TrenchersAI"
              target="_blank"
              rel="noreferrer"
              className={FOOTER_LINK_CLASS}
            >
              X
            </a>
            <a
              href="https://t.me/trenchersai"
              target="_blank"
              rel="noreferrer"
              className={FOOTER_LINK_CLASS}
            >
              Telegram
            </a>
            <a
              href="https://discord.gg/jakcSkCr"
              target="_blank"
              rel="noreferrer"
              className={FOOTER_LINK_CLASS}
            >
              Discord
            </a>
          </nav>
        </div>

        <div className="mt-6 border-t border-white/8 pt-4 text-left text-[11px] leading-relaxed text-white/35 sm:flex sm:items-center sm:justify-between sm:text-[12px]">
          <p>Early access is limited. Digital assets involve substantial risk of loss.</p>
          <p className="mt-2 sm:mt-0">© {year} Trenchers</p>
        </div>
      </div>
      <div className="relative mt-6 w-full overflow-hidden pt-2 pb-0">
        <p className="-mb-1 select-none whitespace-nowrap text-center text-[clamp(42px,9.8vw,172px)] leading-none font-black tracking-[0.08em] text-transparent bg-linear-to-b from-white/88 via-white/58 to-white/24 bg-clip-text sm:-mb-2 sm:tracking-[0.09em] md:tracking-[0.12em]">
          TRENCHERS
        </p>
      </div>
    </footer>
  );
}
