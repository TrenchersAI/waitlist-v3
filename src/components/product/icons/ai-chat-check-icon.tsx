import type { SVGProps } from "react";

/** Checkmark shown briefly after copy/share succeeds in the chat message footer. */
export default function AiChatCheckIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 12 12"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        d="M2.5 6.25L4.75 8.5L9.5 3.75"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
