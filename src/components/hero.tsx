"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import Badge from "./badge";
import PnlGrowth from "./pnl-growth";
import InputFeint from "./input-feint";
import TokenList from "./tokens";
import EmailCapture from "./email-capture";
import Morphing from "./morphing";
import AIAgent from "./ai-agent";
import Graph from "./graph";
import MultiStepComponent from "./multi-step-component";
import logoMark from "./icons/logo-mark.svg";
import Logo from "./logo";
import AIInsights from "./ai-insights";

export default function Hero() {
  const [showAnimatedSections, setShowAnimatedSections] = useState(false);
  const revealAnimation = {
    initial: { opacity: 0, y: 28, filter: "blur(8px)" },
    whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
    viewport: { once: true, amount: 0.45 } as const,
    transition: { duration: 0.65, ease: "easeOut" as const },
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      setShowAnimatedSections(true);
    }, 900);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <section className="relative w-full min-h-screen border-b border-neutral-900">
      <div className="mx-auto max-w-[1550px] px-4 md:px-6 lg:px-8">
        <nav className="bg-black border-b border-white/10 absolute top-0 left-0 right-0 z-30 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Image
              src={logoMark}
              alt="Trenchersai logo"
              width={28}
              height={25}
              priority
            />
            <span className="text-lg tracking-wide text-white">
              TrenchersAI
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/70">
            {/* <Link
              href="/about-us"
              className="transition-colors hover:text-white"
            >
              Why TrenchersAI ?
            </Link> */}
            <div className="flex items-center gap-2">
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-white"
                aria-label="X"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <g clipPath="url(#clip0_394_2)">
                    <mask
                      id="mask0_394_2"
                      style={{ maskType: "luminance" }}
                      maskUnits="userSpaceOnUse"
                      x="0"
                      y="0"
                      width="20"
                      height="20"
                    >
                      <path d="M0 0H20V20H0V0Z" fill="white" />
                    </mask>
                    <g mask="url(#mask0_394_2)">
                      <path
                        d="M15.75 0.937134H18.8171L12.1171 8.61428L20 19.0628H13.8286L8.99143 12.7271L3.46286 19.0628H0.392857L7.55857 10.8486L0 0.938562H6.32857L10.6943 6.72856L15.75 0.937134ZM14.6714 17.2228H16.3714L5.4 2.68142H3.57714L14.6714 17.2228Z"
                        fill="white"
                      />
                    </g>
                  </g>
                  <defs>
                    <clipPath id="clip0_394_2">
                      <rect width="20" height="20" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </a>
              <a
                href="https://t.me"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-white"
                aria-label="Telegram"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M21.8398 6.05599C21.8834 5.79131 21.8552 5.51977 21.7582 5.26967C21.6612 5.01957 21.4989 4.80006 21.2883 4.634C21.0776 4.46795 20.8262 4.36144 20.5604 4.32555C20.2945 4.28967 20.0239 4.32574 19.7768 4.42999L2.67678 11.63C1.48478 12.132 1.42378 13.856 2.67678 14.376C3.91767 14.893 5.17646 15.366 6.45078 15.794C7.61878 16.18 8.89278 16.537 9.91378 16.638C10.1928 16.972 10.5438 17.294 10.9018 17.588C11.4488 18.038 12.1068 18.501 12.7868 18.945C14.1488 19.835 15.6598 20.686 16.6778 21.24C17.8948 21.9 19.3518 21.14 19.5698 19.813L21.8398 6.05599ZM4.59378 12.993L19.7178 6.62499L17.5998 19.465C16.6008 18.922 15.1618 18.109 13.8798 17.271C13.2889 16.8916 12.7185 16.4814 12.1708 16.042C12.0244 15.9224 11.8823 15.7977 11.7448 15.668L15.7058 11.708C15.8934 11.5205 15.9989 11.2661 15.999 11.0008C15.9991 10.7356 15.8938 10.4811 15.7063 10.2935C15.5188 10.1059 15.2644 10.0004 14.9991 10.0003C14.7339 10.0002 14.4794 10.1055 14.2918 10.293L9.95478 14.63C9.22078 14.536 8.19878 14.264 7.07678 13.894C6.2415 13.6157 5.41386 13.3149 4.59478 12.992L4.59378 12.993Z"
                    fill="white"
                  />
                </svg>
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-white"
                aria-label="Discord"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M15.002 4C15.261 4 15.586 4.068 15.847 4.132C16.757 4.352 17.836 4.625 18.602 5.2C19.315 5.735 19.869 6.668 20.297 7.616C21.187 9.591 21.806 12.224 22.02 14.226C22.122 15.176 22.147 16.132 21.964 16.775C21.874 17.091 21.679 17.329 21.542 17.475C21.124 17.918 20.586 18.249 20.054 18.55L19.79 18.699C19.6162 18.7958 19.4412 18.8904 19.265 18.983L18.743 19.253L18.026 19.61L17.449 19.894C17.2379 19.9998 16.9961 20.0274 16.7665 19.972C16.537 19.9166 16.3344 19.7817 16.1948 19.5913C16.0551 19.4008 15.9874 19.1671 16.0035 18.9315C16.0197 18.6959 16.1187 18.4736 16.283 18.304L15.849 17.436C14.6013 17.8161 13.3034 18.0062 11.999 18C10.629 18 9.32204 17.8 8.14904 17.436L7.71604 18.302C7.88099 18.4713 7.98064 18.6936 7.9973 18.9294C8.01395 19.1652 7.94654 19.3992 7.80703 19.5901C7.66751 19.7809 7.46491 19.9161 7.23516 19.9717C7.00542 20.0274 6.7634 19.9998 6.55204 19.894L6.00804 19.624C5.40404 19.326 4.80004 19.028 4.21204 18.699C3.59804 18.356 2.94704 17.991 2.46004 17.474C2.26578 17.2775 2.12113 17.0375 2.03804 16.774C1.85404 16.132 1.88004 15.177 1.98104 14.226C2.19504 12.224 2.81404 9.591 3.70504 7.616C4.13204 6.668 4.68604 5.735 5.39904 5.2C6.16504 4.625 7.24404 4.352 8.15404 4.132C8.41504 4.068 8.73904 4 8.99904 4C9.14286 3.99988 9.28501 4.03078 9.4158 4.09059C9.5466 4.15041 9.66295 4.23773 9.75692 4.3466C9.85089 4.45548 9.92027 4.58334 9.96033 4.72147C10.0004 4.8596 10.0102 5.00474 9.98904 5.147C10.6546 5.04978 11.3264 5.00065 11.999 5C12.69 5 13.365 5.05 14.013 5.148C13.9917 5.00567 14.0014 4.86041 14.0414 4.72216C14.0814 4.58391 14.1507 4.45592 14.2447 4.34693C14.3387 4.23794 14.4551 4.15052 14.586 4.09065C14.7169 4.03078 14.8581 3.99985 15.002 4ZM16.356 6.363C16.206 6.315 16.17 6.336 16.116 6.426L16.054 6.538C15.8924 6.81506 15.647 7.03367 15.3532 7.16234C15.0594 7.29102 14.7323 7.32311 14.419 7.254C13.6237 7.08324 12.8125 6.99809 11.999 7C11.147 7 10.332 7.09 9.57904 7.254C9.26581 7.32311 8.93872 7.29102 8.6449 7.16234C8.35108 7.03367 8.10567 6.81506 7.94404 6.538L7.88204 6.427C7.82904 6.337 7.79304 6.316 7.64404 6.363C7.28804 6.476 6.90604 6.597 6.59904 6.8C6.31204 7.015 5.92904 7.55 5.52804 8.439C4.76204 10.136 4.16204 12.643 3.97004 14.439C3.93004 14.819 3.90804 15.143 3.90404 15.411V15.705C3.9087 15.883 3.92037 16.0237 3.93904 16.127C4.19304 16.375 4.50704 16.57 4.82204 16.749L5.50404 17.126L5.95004 17.361L6.31404 16.633C6.1378 16.4688 6.02677 16.2465 6.00134 16.007C5.97591 15.7674 6.03779 15.5268 6.17561 15.3292C6.31344 15.1317 6.51794 14.9905 6.75153 14.9317C6.98511 14.8728 7.23208 14.9003 7.44704 15.009C8.66304 15.62 10.245 16 11.999 16C13.753 16 15.335 15.618 16.551 15.01C16.7568 14.9069 16.9918 14.878 17.2165 14.928C17.4411 14.9781 17.6416 15.1041 17.7841 15.2848C17.9266 15.4655 18.0025 15.6899 17.9988 15.92C17.9952 16.1501 17.9122 16.3719 17.764 16.548L17.684 16.633L18.048 17.363C18.346 17.2077 18.645 17.0467 18.945 16.88C19.335 16.664 19.745 16.437 20.062 16.127C20.08 16.0237 20.0917 15.883 20.097 15.705V15.411C20.0894 15.0859 20.0674 14.7612 20.031 14.438C19.839 12.643 19.239 10.136 18.473 8.438C18.073 7.55 17.689 7.015 17.403 6.8C17.095 6.597 16.713 6.476 16.356 6.363ZM8.74904 10.5C9.21317 10.5 9.65829 10.6844 9.98647 11.0126C10.3147 11.3408 10.499 11.7859 10.499 12.25C10.499 12.7141 10.3147 13.1592 9.98647 13.4874C9.65829 13.8156 9.21317 14 8.74904 14C8.28491 14 7.83979 13.8156 7.5116 13.4874C7.18341 13.1592 6.99904 12.7141 6.99904 12.25C6.99904 11.7859 7.18341 11.3408 7.5116 11.0126C7.83979 10.6844 8.28491 10.5 8.74904 10.5ZM15.249 10.5C15.7132 10.5 16.1583 10.6844 16.4865 11.0126C16.8147 11.3408 16.999 11.7859 16.999 12.25C16.999 12.7141 16.8147 13.1592 16.4865 13.4874C16.1583 13.8156 15.7132 14 15.249 14C14.7849 14 14.3398 13.8156 14.0116 13.4874C13.6834 13.1592 13.499 12.7141 13.499 12.25C13.499 11.7859 13.6834 11.3408 14.0116 11.0126C14.3398 10.6844 14.7849 10.5 15.249 10.5Z"
                    fill="white"
                  />
                </svg>
              </a>
            </div>
            {/* <Link
              href="/about-us"
              className="transition-colors hover:text-white"
            >
              Why TrenchersAI ?
            </Link> */}
          </div>
        </nav>
        <div className="flex min-h-screen flex-col items-stretch lg:flex-row">
          <div
            className={`order-2 flex w-full flex-col items-center justify-center gap-4 py-12 transition-all duration-700 lg:order-1 lg:sticky lg:top-0 lg:h-screen lg:w-[32%] lg:pr-8 ${
              showAnimatedSections
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0"
            }`}
          >
            {/* <InputFeint /> */}
            {/* <PnlGrowth /> */}
            <Morphing />
          </div>

          <div className="relative order-1 flex w-full flex-col items-center gap-5 border-neutral-900 pt-24 text-center lg:order-2 lg:w-[36%] lg:border-x lg:border-dashed lg:pt-24">
            {/* <Morphing /> */}
            {/* <Graph /> */}
            {/* <MultiStepComponent /> */}
            {/* <Logo /> */}
            <div className="w-full">
              <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center gap-8 pb-12">
                <div
                  className={`transition-all duration-700 ${
                    showAnimatedSections
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-2 opacity-0"
                  }`}
                ></div>
                <div
                  className={`transition-all duration-700 ${
                    showAnimatedSections
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-2 opacity-0"
                  }`}
                >
                  <AIInsights />
                </div>
                <div className="flex flex-col items-center gap-2 mb-5">
                  <div className="flex flex-col items-center gap-6">
                    <h1 className="text-4xl font-medium text-white md:text-4xl w-[450px]">
                      AI Native Trading Terminal For The Trenches
                    </h1>
                    {/* <p className="max-w-[480px] text-sm leading-6 text-neutral-400 md:text-[16px]">
                      AI-native platform for automated trading. Built for vibe
                      trenching. Snipe launches, copy whales, and automate
                      trades instantly.
                    </p> */}
                    <EmailCapture />
                    <p className="max-w-[520px] text-[12px] leading-5 text-neutral-500">
                      Early access is limited. Cryptocurrency trading carries
                      substantial risk of loss.
                    </p>
                  </div>
                </div>
                {/* <div
                  className={`transition-all duration-700 ${
                    showAnimatedSections
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-2 opacity-0"
                  }`}
                >
                  <AIInsights />
                </div> */}
              </div>
            </div>
            {/* <Graph /> */}
          </div>

          <div
            className={`order-3 flex w-full flex-col items-center justify-center py-12 transition-all duration-700 lg:order-3 lg:sticky lg:top-0 lg:h-screen lg:w-[32%] lg:pl-8 ${
              showAnimatedSections
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0"
            }`}
          >
            <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-6">
              <AIAgent />
              <TokenList className="w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
