import type { SVGProps } from "react";

/** Rocket icon for AI Agent tour “Launch detected” pill. */
export default function AiAgentTourLaunchDetectedIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <path d="M6.89258 2.14258L9.85373 5.10374" stroke="white" />
      <path
        d="M8.7981 6.30566L9.15165 8.78051L7.25 11.0002H7L6.5 8.25021"
        stroke="white"
      />
      <path
        d="M5.69455 3.20218L3.21966 2.84863L1.00002 4.75026L1 5.00029L3.74999 5.50029"
        stroke="white"
      />
      <path
        d="M3.67969 5.49284L5.50076 3.34066C6.79341 1.81299 8.76181 1.02919 10.7508 1.25019C10.9718 3.23913 10.188 5.20754 8.66026 6.50019L6.50811 8.32124L3.67969 5.49284Z"
        stroke="white"
      />
      <path
        d="M3.74756 8.25137C3.2594 7.76322 2.46795 7.76322 1.97979 8.25137L1.57227 10.0731L1.74905 10.2499L1.92583 10.4267L3.74756 10.0191C4.23571 9.53097 4.23571 8.73952 3.74756 8.25137Z"
        stroke="white"
      />
    </svg>
  );
}
