import type { SVGProps } from "react";

/** Compact bolt for SOL / quick-action chips. */
export default function LightningBoltIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      className={className}
      aria-hidden
      {...props}
    >
      <polygon
        points="11 3 9 9 16 9 9 17 11 11 4 11 11 3"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
