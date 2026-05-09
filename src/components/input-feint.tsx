"use client";

import { BorderBeam } from "border-beam";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

/** Default copy: natural-language prompt to spawn AI trading agents (Trenchers terminal). */
export const AGENT_CREATION_PLACEHOLDER =
  "Snipe newly launched Solana tokens with liquidity above $20k and less than 5% held by top wallets.";

export type InputFeintProps = {
  className?: string;
  /** Native placeholder when the field is empty (no shimmer overlay). */
  placeholder?: string;
  /** Shown over the empty field with a shimmer gradient (typing hides it). */
  shimmerPrompt?: string;
  /** When set with `onIntroComplete`, fires once after this duration from mount. */
  introDurationMs?: number;
  onIntroComplete?: () => void;
  /** Lock the field during the intro sequence (e.g. demo flow). */
  introReadOnly?: boolean;
};

export default function InputFeint({
  className,
  placeholder = AGENT_CREATION_PLACEHOLDER,
  shimmerPrompt,
  introDurationMs,
  onIntroComplete,
  introReadOnly,
}: InputFeintProps = {}) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [scratchBuilding] = useState(false);

  useEffect(() => {
    if (introDurationMs == null || !onIntroComplete) return;
    const id = window.setTimeout(onIntroComplete, introDurationMs);
    return () => clearTimeout(id);
  }, [introDurationMs, onIntroComplete]);

  const send = () => {
    if (!input.trim()) return;

    setBusy(true);
    window.setTimeout(() => {
      setInput("");
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
      setBusy(false);
    }, 350);
  };

  const showShimmer =
    Boolean(shimmerPrompt) && input.trim().length === 0 && !busy;

  const fieldLocked = busy || scratchBuilding || Boolean(introReadOnly);

  return (
    <BorderBeam
      size="line"
      theme="dark"
      colorVariant="ocean"
      duration={2.4}
      strength={0.72}
      borderRadius={12}
      className={clsx("w-full max-w-[420px]", className)}
    >
      <div
        className={clsx(
          "relative flex w-full bg-[#0F1010] items-end gap-2.5 rounded-xl border border-white/5 pb-3 pr-3 pt-2 pl-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] duration-150 focus-within:border-white/25 focus-within:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_1px_0_rgba(255,255,255,0.05)]",
        )}
      >
        <div className="relative min-h-20 flex-1">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            readOnly={introReadOnly}
            onChange={(e) => {
              setInput(e.target.value);
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={busy || scratchBuilding}
            placeholder={showShimmer ? "" : placeholder}
            className="placeholder:text-white/28 max-h-[120px] min-h-20 w-full resize-none bg-transparent pt-1 pl-1 pr-2 pb-3.5 text-[13px] leading-snug text-white outline-none focus:outline-none"
          />
          {showShimmer ? (
            <div className="pointer-events-none absolute inset-0 flex pt-1 pl-1 pr-2 pb-3.5">
              <span className="shimmer-text text-[13px] leading-snug">
                {shimmerPrompt}
              </span>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={send}
          disabled={fieldLocked || input.trim().length === 0}
          aria-label={
            busy || scratchBuilding ? "Creating…" : "Submit agent prompt"
          }
          className="grid size-8 shrink-0 place-items-center rounded-full border border-white/18 bg-transparent text-white transition-[background-color,border-color,transform] duration-150 enabled:cursor-pointer enabled:hover:border-white/40 enabled:hover:bg-white/14 enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:border-white/10 disabled:hover:border-white/18 disabled:hover:bg-white/6 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25"
        >
          {busy || scratchBuilding ? (
            <span className="text-xs font-semibold leading-none">...</span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={16}
              height={16}
              viewBox="0 0 20 20"
              aria-hidden
              className="shrink-0"
            >
              <line
                x1="10"
                y1="17"
                x2="10"
                y2="3"
                fill="none"
                stroke="#ffffff"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
              <polyline
                points="15 8 10 3 5 8"
                fill="none"
                stroke="#ffffff"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          )}
        </button>
      </div>
    </BorderBeam>
  );
}
