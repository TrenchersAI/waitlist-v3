"use client";

import Image from "next/image";
import Link from "next/link";
import FooterLogo from "./footer-logo";
import { usePathname } from "next/navigation";

import logoMark from "./icons/logo-mark.svg";

const FOOTER_LINK_CLASS =
  "inline-block text-[14px] text-white/90 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/analytics" || pathname?.startsWith("/analytics/")) {
    return null;
  }

  const year = new Date().getFullYear();

  return (
    <footer className="w-full min-w-0 border-t border-white/6 bg-black">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-16 sm:px-6 md:px-8 md:py-20 lg:pt-24 lg:pb-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10 xl:gap-16">
          <div className="min-w-0 lg:col-span-7">
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
                TrenchersAI
              </span>
            </Link>
            <p className="mt-5 max-w-[48ch] text-left text-[14px] leading-[1.65] text-white/55 md:text-[15px]">
              AI-native trading terminal for the trenches. Early access is
              limited; digital assets involve substantial risk of loss.
            </p>
            <p className="mt-3 text-left text-[12px] leading-snug text-white/40">
              © {year} TrenchersAI. All rights reserved.
            </p>
          </div>

          <nav
            className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-2 lg:gap-8 xl:gap-10"
            aria-label="Footer"
          >
            <div className="flex min-w-0 flex-col items-start text-left">
              <span className="text-sm text-white/45">Company</span>
              <ul className="mt-4 flex flex-col gap-3">
                <li>
                  <Link href="/terms" className={FOOTER_LINK_CLASS}>
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className={FOOTER_LINK_CLASS}>
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/about-us" className={FOOTER_LINK_CLASS}>
                    About
                  </Link>
                </li>
              </ul>
            </div>

            <div className="flex min-w-0 flex-col items-start text-left">
              <span className="text-sm text-white/45">Community</span>
              <ul className="mt-4 flex flex-col gap-3">
                <li>
                  <a
                    href="https://x.com/TrenchersAI"
                    target="_blank"
                    rel="noreferrer"
                    className={FOOTER_LINK_CLASS}
                  >
                    X
                  </a>
                </li>
                <li>
                  <a
                    href="https://t.me/trenchersai"
                    target="_blank"
                    rel="noreferrer"
                    className={FOOTER_LINK_CLASS}
                  >
                    Telegram
                  </a>
                </li>
                <li>
                  <a
                    href="https://discord.gg/jakcSkCr"
                    target="_blank"
                    rel="noreferrer"
                    className={FOOTER_LINK_CLASS}
                  >
                    Discord
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl">
        <FooterLogo />
      </div>
    </footer>
  );
}
