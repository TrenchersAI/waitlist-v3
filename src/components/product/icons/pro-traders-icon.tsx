import type { SVGProps } from "react";

export default function ProTradersIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="14"
      viewBox="0 0 12 14"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        d="M2 14V12H0V2H2V0H3V2H5V12H3V14H2ZM1 11H4V3H1V11ZM9 14V9.385H7V3.808H9V0H10V3.808H12V9.385H10V14H9ZM8 8.384H11V4.808H8V8.384Z"
        fill="currentColor"
      />
    </svg>
  );
}
