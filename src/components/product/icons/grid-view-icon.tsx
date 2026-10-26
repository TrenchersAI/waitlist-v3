import type { SVGProps } from "react";

export default function GridViewIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <rect
        x="2"
        y="2"
        width="5"
        height="5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <rect
        x="9"
        y="2"
        width="5"
        height="5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <rect
        x="2"
        y="9"
        width="5"
        height="5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <rect
        x="9"
        y="9"
        width="5"
        height="5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
