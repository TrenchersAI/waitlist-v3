import { useId } from "react";
import type { SVGProps } from "react";

/** Person + star — holder concentration for trench token rows. */
export default function HolderConcentrationIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  const clipId = useId().replace(/:/g, "");
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
      <path
        d="M8.00025 7.19974C9.32573 7.19974 10.4003 6.12523 10.4003 4.79974C10.4003 3.47426 9.32573 2.39974 8.00025 2.39974C6.67477 2.39974 5.60025 3.47426 5.60025 4.79974C5.60025 6.12523 6.67477 7.19974 8.00025 7.19974Z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.19986 12.3147C4.17986 10.6883 5.96306 9.60026 7.99986 9.60026"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M13.712 10.8849C13.6876 10.8096 13.6223 10.7546 13.544 10.7432L12.2606 10.5568L11.6868 9.39378C11.6168 9.25155 11.3831 9.25155 11.3131 9.39378L10.7393 10.5566L9.45593 10.7429C9.37759 10.7543 9.31232 10.8093 9.28787 10.8846C9.26343 10.9599 9.2837 11.0429 9.34065 11.0982L10.2693 12.0032L10.0498 13.2813C10.0365 13.3596 10.0684 13.4385 10.1326 13.4852C10.1968 13.5316 10.282 13.5377 10.352 13.501L11.4998 12.8974L12.6476 13.501C12.6781 13.5171 12.7112 13.5249 12.7445 13.5249C12.7876 13.5249 12.8306 13.5116 12.867 13.4852C12.9312 13.4385 12.9634 13.3596 12.9498 13.2813L12.7304 12.0032L13.659 11.0982C13.7159 11.0429 13.7362 10.9599 13.7118 10.8846L13.712 10.8849Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="5" height="5" fill="white" transform="translate(9 9)" />
        </clipPath>
      </defs>
    </svg>
  );
}
