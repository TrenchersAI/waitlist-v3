import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import SiteNav from "@/src/components/site-nav";
import logoMark from "@/src/components/icons/logo-mark.svg";
import ChevronRightIcon from "@/src/icons/chevron-right-icon";
import heroImage from "./trenchers-x-tradingview.png";

const TITLE =
  "Trenchers Partners with TradingView for Professional Charts";

const DESCRIPTION =
  "TradingView charting is coming to Trenchers natively — professional tools, indicators, and timeframes inside the terminal.";

export const metadata: Metadata = {
  title: "TradingView Partnership",
  description: DESCRIPTION,
  alternates: {
    canonical: "/blog/tradingview",
  },
  openGraph: {
    type: "article",
    title: TITLE,
    description: DESCRIPTION,
    url: "/blog/tradingview",
    images: [
      {
        url: heroImage.src,
        width: heroImage.width,
        height: heroImage.height,
        alt: "Trenchers and TradingView partnership",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [heroImage.src],
  },
};

const FEATURES = [
  {
    title: "Advanced charting tools.",
    body: "Analyze price action with candles, volume, and customizable layouts without leaving Trenchers.",
  },
  {
    title: "100+ technical indicators.",
    body: "Use RSI, MACD, moving averages, and more across any pair you're watching.",
  },
  {
    title: "Drawing tools.",
    body: "Mark support, resistance, trendlines, and Fibonacci levels directly on the chart you trade from.",
  },
  {
    title: "Multiple timeframes.",
    body: "Move from 1s to daily timeframes without switching tabs or losing your analysis.",
  },
  {
    title: "Social data overlay.",
    body: "Bring ideas and market context onto the same chart as your positions, keeping analysis right next to execution.",
  },
] as const;

const crumbClass =
  "inline-flex min-h-10 items-center text-[13px] text-white/50 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30";

export default function TradingViewBlogPage() {
  return (
    <div className="site-canvas-bg relative min-h-screen w-full min-w-0">
      <SiteNav />

      <article className="mx-auto w-full min-w-0 max-w-3xl px-5 pb-20 pt-28 sm:px-6 md:pb-28 md:pt-32">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-2 text-[13px] text-white/50">
            <li className="flex items-center gap-2">
              <Link href="/" className={crumbClass}>
                Home
              </Link>
              <ChevronRightIcon className="size-3 text-white/25" />
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex min-h-10 items-center">Blog</span>
              <ChevronRightIcon className="size-3 text-white/25" />
            </li>
            <li className="inline-flex min-h-10 items-center text-white/60">
              TradingView Partnership
            </li>
          </ol>
        </nav>

        <header className="mt-8 md:mt-10">
          <h1 className="text-balance text-[32px] font-semibold leading-[1.12] tracking-[-0.03em] text-white sm:text-[40px] md:text-[44px]">
            {TITLE}
          </h1>

          <div className="mt-5 flex items-center gap-2.5">
            <span className="inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/8">
              <Image
                src={logoMark}
                alt=""
                width={16}
                height={14}
                className="h-3.5 w-4"
              />
            </span>
            <p className="text-[14px] text-white/50">
              <span className="font-medium text-white">Trenchers</span>
              <span className="mx-2 text-white/25" aria-hidden>
                |
              </span>
              <time dateTime="2026-08-19">August 19, 2026</time>
            </p>
          </div>
        </header>

        <figure className="mt-8 md:mt-10">
          <Image
            src={heroImage}
            alt="Trenchers and TradingView partnership"
            priority
            className="h-auto w-full rounded-xl border border-white/8"
          />
        </figure>

        <div className="mt-10 space-y-10 text-[16px] leading-[1.7] text-white/65 md:mt-12 md:text-[17px]">
          <p>
            We partnered with{" "}
            <a
              href="https://www.tradingview.com/"
              target="_blank"
              rel="noreferrer"
              className="text-[#8B93FF] underline-offset-2 transition-colors hover:text-[#A8AEFF] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              TradingView
            </a>{" "}
            to bring professional charting directly into Trenchers — so you can
            analyze price action, mark levels, and execute from one terminal.
          </p>

          <section>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-white sm:text-[30px]">
              Why TradingView
            </h2>
            <p className="mt-4">
              TradingView is one of the most widely used charting platforms in
              financial markets, trusted by millions of traders worldwide. Its
              powerful charting tools, indicators, drawing capabilities, and
              market data make it a natural fit for the Trenchers trading
              experience.
            </p>
            <p className="mt-5">
              This partnership brings that experience natively into Trenchers,
              giving crypto traders a more complete terminal without adding
              another tool to their workflow.
            </p>
          </section>

          <section>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-white sm:text-[30px]">
              What This Gives You
            </h2>
            <ul className="mt-5 space-y-4">
              {FEATURES.map((feature) => (
                <li key={feature.title}>
                  <strong className="font-semibold text-white">
                    {feature.title}
                  </strong>{" "}
                  <span>{feature.body}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </article>
    </div>
  );
}
