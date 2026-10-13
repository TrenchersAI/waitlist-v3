import type { SVGProps } from "react";

/** Green check circle for AI Agent tour “Snipe Complete” pill. */
export default function AiAgentTourSnipeCompleteIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={15}
      height={15}
      viewBox="0 0 15 15"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        d="M7.19922 13.2002C10.5129 13.2002 13.1992 10.5139 13.1992 7.2002C13.1992 3.88649 10.5129 1.2002 7.19922 1.2002C3.88551 1.2002 1.19922 3.88649 1.19922 7.2002C1.19922 10.5139 3.88551 13.2002 7.19922 13.2002Z"
        fill="#00BC7D"
        fillOpacity={0.15}
        stroke="#00BC7D"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.40039 7.2L6.60039 8.4L9.00039 6"
        fill="#00BC7D"
        fillOpacity={0.15}
      />
      <path
        d="M5.40039 7.2L6.60039 8.4L9.00039 6"
        stroke="#00BC7D"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
