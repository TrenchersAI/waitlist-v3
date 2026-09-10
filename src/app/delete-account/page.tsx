import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import SiteNav from "@/src/components/site-nav";
import logoMark from "@/src/components/icons/logo-mark.svg";
import ChevronRightIcon from "@/src/icons/chevron-right-icon";
import heroImage from "./hero.jpeg";

const TITLE = "Delete your Trenchers account";
const DESCRIPTION =
  "How to permanently delete your Trenchers account and what happens to your data when you do.";
const SUPPORT_EMAIL = "support@trenchers.ai";
const LINK_CLASS =
  "text-[#8B93FF] underline-offset-2 transition-colors hover:text-[#A8AEFF] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30";
const crumbClass =
  "inline-flex min-h-10 items-center text-[13px] text-white/50 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30";

const DELETED_ITEMS = [
  {
    title: "Your profile.",
    body: "Username, display name, and account settings.",
  },
  {
    title: "Your trading agents.",
    body: "Every agent you created, its configuration, and its configuration history.",
  },
  {
    title: "Your agents' activity.",
    body: "Trade history, open and closed positions, and scan/watch records.",
  },
  {
    title: "Your wallets.",
    body: "Your embedded Solana wallets and their keys.",
  },
  {
    title: "Your login identity.",
    body: "The email or Google account linked to your Trenchers login.",
  },
  {
    title: "Rewards data.",
    body: "Quality points and any accrued fee-rebate balance.",
  },
] as const;

export const metadata: Metadata = {
  title: "Delete your account",
  description: DESCRIPTION,
  alternates: {
    canonical: "/delete-account",
  },
  openGraph: {
    type: "article",
    title: TITLE,
    description: DESCRIPTION,
    url: "/delete-account",
    images: [
      {
        url: heroImage.src,
        width: heroImage.width,
        height: heroImage.height,
        alt: "Trenchers",
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

export default function DeleteAccountPage() {
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
            <li className="inline-flex min-h-10 items-center text-white/60">
              Delete account
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
              <time dateTime="2026-09-10">September 10, 2026</time>
            </p>
          </div>
        </header>

        <figure className="mt-8 md:mt-10">
          <Image
            src={heroImage}
            alt="Trenchers — AI that trades before you click"
            priority
            className="h-auto w-full rounded-xl border border-white/8"
          />
        </figure>

        <div className="mt-10 space-y-10 text-[16px] leading-[1.7] text-white/65 md:mt-12 md:text-[17px]">
          <p>
            This page explains how to permanently delete your Trenchers account
            and what happens to your data when you do. App: Trenchers.
            Developer: Trenchers (TRENCHERS INC.).
          </p>

          <section>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-white sm:text-[30px]">
              Before you start: withdraw your funds
            </h2>
            <p className="mt-4">
              Your Trenchers wallets are non-custodial embedded wallets.{" "}
              <strong className="font-semibold text-white">
                Deleting your account destroys the keys to them.
              </strong>{" "}
              Any SOL left in your main wallet or in an agent&apos;s wallet
              becomes permanently unreachable — by you and by us. We cannot
              recover it afterwards.
            </p>
            <p className="mt-5 font-semibold text-white">
              Withdraw everything before you request deletion.
            </p>
            <ol className="mt-5 list-decimal space-y-3 pl-5">
              <li>
                Open Trenchers and go to{" "}
                <strong className="font-semibold text-white">
                  Profile → Wallet
                </strong>
              </li>
              <li>
                Tap{" "}
                <strong className="font-semibold text-white">Withdraw</strong>{" "}
                and send your balance to an address you control
              </li>
              <li>
                Check each agent for a remaining balance and withdraw that too
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-white sm:text-[30px]">
              Option 1 — Delete it in the app
            </h2>
            <p className="mt-4">
              The fastest way. You do not need to contact us.
            </p>
            <ol className="mt-5 list-decimal space-y-3 pl-5">
              <li>Open Trenchers</li>
              <li>
                Tap the{" "}
                <strong className="font-semibold text-white">
                  profile icon
                </strong>{" "}
                in the top-right of the header
              </li>
              <li>
                Scroll to{" "}
                <strong className="font-semibold text-white">Account</strong>{" "}
                and tap{" "}
                <strong className="font-semibold text-white">
                  Delete account
                </strong>
              </li>
              <li>
                If you still have funds, tap{" "}
                <strong className="font-semibold text-white">
                  Withdraw first
                </strong>{" "}
                — or confirm you accept losing them
              </li>
              <li>
                Type{" "}
                <strong className="font-semibold text-white">DELETE</strong> to
                confirm, then tap{" "}
                <strong className="font-semibold text-white">
                  Delete my account
                </strong>
              </li>
            </ol>
            <p className="mt-5">
              Your account and the data listed below are removed, and you are
              signed out immediately.
            </p>
          </section>

          <section>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-white sm:text-[30px]">
              Option 2 — If you cannot access the app
            </h2>
            <p className="mt-4">
              Use this if you have lost access to your device, cannot sign in,
              or have already uninstalled Trenchers.
            </p>
            <p className="mt-5">
              <strong className="font-semibold text-white">
                We must verify that you own the account before we delete it.
              </strong>{" "}
              Deleting an account destroys the keys to its wallets, so an
              unverified request could permanently destroy someone else&apos;s
              funds. We will not act on a request we cannot verify — no
              exceptions.
            </p>
            <h3 className="mt-8 text-[20px] font-semibold tracking-[-0.02em] text-white sm:text-[22px]">
              If you signed in with email, or Google
            </h3>
            <p className="mt-4">
              Your account has an email address on file. Send the request{" "}
              <strong className="font-semibold text-white">
                from that email address
              </strong>{" "}
              to{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className={LINK_CLASS}>
                {SUPPORT_EMAIL}
              </a>
              , with the subject{" "}
              <strong className="font-semibold text-white">
                &quot;Delete my account&quot;
              </strong>
              .
            </p>
            <p className="mt-5">
              We will reply with a confirmation code.{" "}
              <strong className="font-semibold text-white">
                Your account is not deleted until you reply with that code.
              </strong>
            </p>

            <h3 className="mt-8 text-[20px] font-semibold tracking-[-0.02em] text-white sm:text-[22px]">
              Also include
            </h3>
            <ul className="mt-5 list-disc space-y-3 pl-5">
              <li>Your Trenchers username, if you set one</li>
              <li>
                The words &quot;I want my account and associated data
                deleted&quot;
              </li>
            </ul>
            <p className="mt-5">
              We will confirm by email once deletion is complete,{" "}
              <strong className="font-semibold text-white">
                within 30 days of the verified request
              </strong>
              .
            </p>
          </section>

          <section>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-white sm:text-[30px]">
              What is deleted
            </h2>
            <ul className="mt-5 space-y-4">
              {DELETED_ITEMS.map((item) => (
                <li key={item.title}>
                  <strong className="font-semibold text-white">
                    {item.title}
                  </strong>{" "}
                  <span>{item.body}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5">
              Data stored only on your phone — your local transaction history,
              AI permission setting, and display preferences — is removed when
              you uninstall the app.
            </p>
          </section>

          <section>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-white sm:text-[30px]">
              What is kept, and for how long
            </h2>
            <ul className="mt-5 space-y-4">
              <li>
                <strong className="font-semibold text-white">
                  Blockchain transactions cannot be deleted.
                </strong>{" "}
                Any trade or transfer your agents made on Solana is recorded on
                a public blockchain that we do not control. Those records
                remain visible on-chain permanently and are not affected by
                deleting your account.
              </li>
              <li>
                We do not retain your profile, agents, wallets, login identity,
                or rewards data after deletion. We may keep a record of the
                deletion request itself (the requesting email and the date we
                completed it) only as needed to confirm the request and to
                comply with applicable law.
              </li>
              <li>
                We do not keep identifiable analytics after your account is
                deleted.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-white sm:text-[30px]">
              Can this be undone?
            </h2>
            <p className="mt-4">
              No. Deletion is permanent. You cannot recover your account, your
              agents, their history, or your wallets afterwards. To use
              Trenchers again you would create a new account and start over.
            </p>
          </section>

          <p>
            Questions:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className={LINK_CLASS}>
              {SUPPORT_EMAIL}
            </a>
            . Last updated: September 10, 2026.
          </p>
        </div>
      </article>
    </div>
  );
}
