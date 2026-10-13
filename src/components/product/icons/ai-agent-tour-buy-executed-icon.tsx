import type { SVGProps } from "react";

/** Cursor / click icon for AI Agent tour “Buy executed” pill. */
export default function AiAgentTourBuyExecutedIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        d="M2 8H4M8 2V4M5.2 5.2L3.73333 3.73333M10.8 5.2L12.2667 3.73333M5.2 10.8L3.73333 12.2667M8 8L14 10L11.3333 11.3333L10 14L8 8Z"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
