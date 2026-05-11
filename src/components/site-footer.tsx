import Image from "next/image";
import Link from "next/link";
import logoMark from "./icons/logo-mark.svg";

const SOCIAL_LINK_CLASS =
  "text-neutral-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full min-w-0 border-t border-neutral-900 bg-[#0a0a0a]">
      <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-10 px-4 py-12 md:flex-row md:items-start md:justify-between md:px-6 lg:px-8">
        <div className="flex max-w-md flex-col gap-3">
          <Link
            href="/"
            className="flex w-fit items-center gap-2.5 text-white transition-opacity hover:opacity-90"
          >
            <span aria-hidden className="inline-flex shrink-0">
              <Image src={logoMark} alt="" width={28} height={25} />
            </span>
            <span className="text-lg tracking-wide">TrenchersAI</span>
          </Link>
          <p className="text-sm leading-6 text-neutral-500">
            AI-native trading terminal for the trenches. Early access is
            limited; digital assets involve substantial risk of loss.
          </p>
        </div>

        <nav
          className="flex flex-col gap-3 text-sm md:items-end"
          aria-label="Footer"
        >
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-neutral-400">
            <Link href="/" className={SOCIAL_LINK_CLASS}>
              Home
            </Link>
            <Link href="/about-us" className={SOCIAL_LINK_CLASS}>
              About
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 md:justify-end">
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
        </nav>
      </div>

      <div className="border-t border-neutral-900/80">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-neutral-600 md:px-6 lg:px-8">
          © {year} TrenchersAI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
