import type { SVGProps } from "react";

/** Circle-dollar icon for Solscan / account explorer links. */
export default function SolUsdIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        d="M18.7175 18.7175C16.9359 20.4991 14.5196 21.5 12 21.5C9.48044 21.5 7.06408 20.4991 5.28249 18.7175C3.50089 16.9359 2.5 14.5196 2.5 12C2.5 9.48044 3.50089 7.06408 5.28249 5.28249C7.06408 3.50089 9.48044 2.5 12 2.5C14.5196 2.5 16.9359 3.50089 18.7175 5.28249C20.4991 7.06408 21.5 9.48044 21.5 12C21.5 14.5196 20.4991 16.9359 18.7175 18.7175Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 14.433C9.0638 15.1689 9.41382 15.8505 9.97482 16.3311C10.5358 16.8116 11.263 17.0529 12 17.003C14.42 17.003 15 15.613 15 14.433C15 13.253 14 12.003 12 12.003C10 12.003 9 11.213 9 9.603C9.01865 9.23261 9.11202 8.86983 9.2745 8.53646C9.43698 8.20309 9.66521 7.90603 9.94546 7.66315C10.2257 7.42026 10.5522 7.23657 10.9053 7.12313C11.2583 7.00968 11.6307 6.96882 12 7.003C12.7375 6.97124 13.4592 7.22292 14.0171 7.70638C14.5749 8.18985 14.9266 8.86846 15 9.603M12 18.5V17.2M12 5.5V6.999"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
