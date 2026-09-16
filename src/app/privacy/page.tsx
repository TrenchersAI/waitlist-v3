import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUp } from "lucide-react";

import SiteNav from "@/src/components/site-nav";
import logoMark from "@/src/components/icons/logo-mark.svg";
import ChevronRightIcon from "@/src/icons/chevron-right-icon";
import {
  SOCIAL_PREVIEW_IMAGE_ALT,
  SOCIAL_PREVIEW_IMAGE_HEIGHT,
  SOCIAL_PREVIEW_IMAGE_PATH,
  SOCIAL_PREVIEW_IMAGE_WIDTH,
  TRENCHERS_X_HANDLE,
} from "@/src/lib/site-metadata";

import {
  LegalTocDesktop,
  LegalTocMobile,
} from "@/src/components/legal/legal-toc";

import { PolicyBody, PolicyIntro } from "./policy-content";
import { POLICY_SECTIONS, POLICY_UPDATED } from "./policy-sections";

const TITLE = "Privacy Policy";
const SHARE_TITLE = "Trenchers AI Privacy Policy";
const DESCRIPTION =
  "How Trenchers AI collects, uses, shares and protects your information across our website, web app, mobile app and APIs.";

const crumbClass =
  "inline-flex min-h-10 items-center text-[13px] text-white/50 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30";
const footerLinkClass =
  "inline-flex min-h-10 items-center gap-1.5 text-[14px] text-white/60 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    type: "article",
    title: SHARE_TITLE,
    description: DESCRIPTION,
    url: "/privacy",
    modifiedTime: POLICY_UPDATED.iso,
    images: [
      {
        url: SOCIAL_PREVIEW_IMAGE_PATH,
        width: SOCIAL_PREVIEW_IMAGE_WIDTH,
        height: SOCIAL_PREVIEW_IMAGE_HEIGHT,
        alt: SOCIAL_PREVIEW_IMAGE_ALT,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: TRENCHERS_X_HANDLE,
    title: SHARE_TITLE,
    description: DESCRIPTION,
    images: [{ url: SOCIAL_PREVIEW_IMAGE_PATH, alt: SOCIAL_PREVIEW_IMAGE_ALT }],
  },
};

export default function PrivacyPage() {
  return (
    <div className="site-canvas-bg relative min-h-screen w-full min-w-0">
      <SiteNav />
      {/* The site nav has no fill of its own; on a page this long, fade the
          copy out beneath it so the logo stays legible while reading. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-30 h-20 bg-linear-to-b from-background from-55% to-transparent"
      />

      <div className="mx-auto w-full min-w-0 max-w-6xl px-5 pb-20 pt-28 sm:px-6 md:px-8 md:pb-28 md:pt-32">
        <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-16">
          <LegalTocDesktop
            sections={POLICY_SECTIONS}
            bodyId="policy-body"
            label={TITLE}
          />

          <article className="min-w-0 max-w-3xl">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-x-2 text-[13px] text-white/50">
                <li className="flex items-center gap-2">
                  <Link href="/" className={crumbClass}>
                    Home
                  </Link>
                  <ChevronRightIcon className="size-3 text-white/25" />
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex min-h-10 items-center">
                    Legal
                  </span>
                  <ChevronRightIcon className="size-3 text-white/25" />
                </li>
                <li
                  aria-current="page"
                  className="inline-flex min-h-10 items-center text-white/60"
                >
                  {TITLE}
                </li>
              </ol>
            </nav>

            <header className="mt-8 md:mt-10">
              <h1 className="text-balance text-[36px] font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-[44px] md:text-[52px]">
                {TITLE}
              </h1>
              <p className="mt-5 max-w-[58ch] text-pretty text-[17px] leading-[1.6] text-white/60 md:text-[19px]">
                {DESCRIPTION}
              </p>
              <div className="mt-6 flex items-center gap-2.5">
                <span className="inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/8">
                  <Image
                    src={logoMark}
                    alt=""
                    width={16}
                    height={14}
                    className="h-3.5 w-4"
                  />
                </span>
                <p className="text-[13px] text-white/50 sm:text-[14px]">
                  <span className="font-medium text-white">Trenchers AI</span>
                  <span className="mx-2 text-white/25" aria-hidden>
                    |
                  </span>
                  <span className="whitespace-nowrap">
                    Last updated{" "}
                    <time dateTime={POLICY_UPDATED.iso}>
                      {POLICY_UPDATED.label}
                    </time>
                  </span>
                </p>
              </div>
            </header>

            <PolicyIntro />
            <LegalTocMobile
              sections={POLICY_SECTIONS}
              bodyId="policy-body"
              label={TITLE}
            />
            <PolicyBody />

            <footer className="mt-20 flex flex-col gap-4 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[14px] text-white/50">
                Last updated{" "}
                <time dateTime={POLICY_UPDATED.iso}>{POLICY_UPDATED.label}</time>
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                <Link href="/terms" className={footerLinkClass}>
                  Terms of Service
                </Link>
                <Link href="/delete-account" className={footerLinkClass}>
                  Delete your account
                </Link>
                <a href="#top" className={footerLinkClass}>
                  Back to top
                  <ArrowUp aria-hidden className="size-3.5" />
                </a>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}
