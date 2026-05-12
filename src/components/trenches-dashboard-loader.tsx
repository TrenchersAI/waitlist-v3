"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import logoMark from "./icons/logo-mark.svg";

export default function TrenchesDashboardLoader() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="flex min-h-[380px] flex-col items-center justify-center gap-10 px-1 py-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative size-14 rounded-2xl border border-white/12 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          {!reduceMotion ? (
            <motion.span
              className="absolute inset-1 rounded-xl border border-white/15"
              animate={{ opacity: [0.35, 1, 0.35], scale: [0.96, 1, 0.96] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}
          <span className="relative flex size-full items-center justify-center">
            <Image
              src={logoMark}
              alt=""
              width={26}
              height={23}
              className="h-[23px] w-[26px]"
              aria-hidden
            />
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-[15px] font-medium tracking-tight text-[#fafafa]">
            Loading the trenches
          </p>
          <p className="max-w-[280px] text-[12px] leading-relaxed text-neutral-500">
            Syncing your referral desk and tier stats…
          </p>
        </div>
      </div>

      <div className="w-full max-w-[320px] space-y-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
          {!reduceMotion ? (
            <motion.div
              className="h-full w-2/5 rounded-full bg-linear-to-r from-neutral-600 via-neutral-200 to-neutral-600"
              initial={{ x: "-120%" }}
              animate={{ x: ["-120%", "280%"] }}
              transition={{
                duration: 1.35,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ) : (
            <div className="h-full w-2/5 rounded-full bg-neutral-500" />
          )}
        </div>
        <div className="flex justify-center gap-1.5">
          {reduceMotion ? (
            <>
              <span className="size-1.5 rounded-full bg-white/35" />
              <span className="size-1.5 rounded-full bg-white/35" />
              <span className="size-1.5 rounded-full bg-white/35" />
            </>
          ) : (
            [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-1.5 rounded-full bg-white/35"
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: i * 0.18,
                  ease: "easeInOut",
                }}
              />
            ))
          )}
        </div>
      </div>

      <p className="text-[10px] font-medium tracking-[0.14em] text-neutral-600 uppercase">
        TrenchersAI waitlist
      </p>
    </div>
  );
}
