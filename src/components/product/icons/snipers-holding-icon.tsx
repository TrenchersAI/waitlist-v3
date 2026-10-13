import { useId } from "react";
import type { SVGProps } from "react";

/** Crosshair / snipers target — trench token row (Figma export). */
export default function SnipersHoldingIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  const clipId = useId().replace(/:/g, "");
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M6 8C7.10457 8 8 7.10457 8 6C8 4.89543 7.10457 4 6 4C4.89543 4 4 4.89543 4 6C4 7.10457 4.89543 8 6 8Z"
          fill="currentColor"
        />
        <path
          d="M11.3333 5.49999H10.8073C10.5733 3.23332 8.76667 1.42666 6.5 1.19266V0.666656C6.5 0.390656 6.276 0.166656 6 0.166656C5.724 0.166656 5.5 0.390656 5.5 0.666656V1.19266C3.23334 1.42666 1.42667 3.23332 1.19267 5.49999H0.666672C0.390672 5.49999 0.166672 5.72399 0.166672 5.99999C0.166672 6.27599 0.390672 6.49999 0.666672 6.49999H1.19267C1.42667 8.76665 3.23334 10.5733 5.5 10.8073V11.3333C5.5 11.6093 5.724 11.8333 6 11.8333C6.276 11.8333 6.5 11.6093 6.5 11.3333V10.8073C8.76667 10.5733 10.5733 8.76665 10.8073 6.49999H11.3333C11.6093 6.49999 11.8333 6.27599 11.8333 5.99999C11.8333 5.72399 11.6093 5.49999 11.3333 5.49999ZM6 9.83332C3.88667 9.83332 2.16667 8.11332 2.16667 5.99999C2.16667 3.88666 3.88667 2.16666 6 2.16666C8.11334 2.16666 9.83334 3.88666 9.83334 5.99999C9.83334 8.11332 8.11334 9.83332 6 9.83332Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="12" height="12" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
