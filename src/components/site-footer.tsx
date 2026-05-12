import Image from "next/image";
import Link from "next/link";
import logoMark from "./icons/logo-mark.svg";

const SOCIAL_LINK_CLASS =
  "text-neutral-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-canvas-bg w-full min-w-0 border-t border-white/6">
      <div className="mx-auto flex w-full min-w-0 max-w-[1200px] flex-col gap-12 px-4 py-16 sm:px-6 md:flex-row md:items-start md:justify-between md:gap-16 md:px-8 md:py-20 lg:py-24">
        <div className="flex max-w-md flex-col gap-4">
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
          <p className="max-w-[42ch] text-[14px] leading-[1.65] text-white/55 md:text-[15px]">
            AI-native trading terminal for the trenches. Early access is
            limited; digital assets involve substantial risk of loss.
          </p>
        </div>

        <nav className="flex flex-col gap-7 text-sm md:items-end" aria-label="Footer">
          <div className="flex flex-col gap-3 md:items-end">
            <span className="text-[10.5px] font-semibold tracking-[0.2em] text-white/35 uppercase">
              Site
            </span>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-white/70 md:justify-end">
              <Link href="/" className={SOCIAL_LINK_CLASS}>
                Home
              </Link>
              <Link href="/about-us" className={SOCIAL_LINK_CLASS}>
                About
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <span className="text-[10.5px] font-semibold tracking-[0.2em] text-white/35 uppercase">
              Community
            </span>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-white/70 md:justify-end">
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className={SOCIAL_LINK_CLASS}
              >
                X
              </a>
              <a
                href="https://t.me"
                target="_blank"
                rel="noreferrer"
                className={SOCIAL_LINK_CLASS}
              >
                Telegram
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                className={SOCIAL_LINK_CLASS}
              >
                Discord
              </a>
            </div>
          </div>
        </nav>
      </div>

      <div className="border-t border-white/5 bg-white/1.5">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-4 py-7 text-[12px] text-white/40 sm:px-6 md:flex-row md:px-8 md:py-9">
          <p>© {year} TrenchersAI. All rights reserved.</p>
          <p className="text-white/30">
            Built for the trenches.
          </p>
        </div>
      </div>
    </footer>
  );
}
