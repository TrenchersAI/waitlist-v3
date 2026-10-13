import type { SVGProps } from "react";

export default function NewTokenIcon({
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
      {...props}
    >
      <g clipPath="url(#clip0_124_5943)">
        <path
          d="M7.82667 9.55554L8.69956 13.6862C8.80089 14.1662 8.49423 14.6382 8.01334 14.7395L7.144 14.9235C6.664 15.0249 6.192 14.7182 6.09067 14.2373L5.11111 9.55554"
          stroke="white"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12.2222 11.7778C12.2222 11.7778 10.5004 9.55554 8.44445 9.55554H4.44445C2.84889 9.55554 1.55556 8.26221 1.55556 6.66665C1.55556 5.0711 2.84889 3.77776 4.44445 3.77776H8.44445C10.4996 3.77776 12.2222 1.55554 12.2222 1.55554V11.7778Z"
          stroke="white"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.11111 3.77783V9.55561"
          stroke="white"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.5638 5.33337C15.0238 5.5996 15.3333 6.09702 15.3333 6.66671C15.3333 7.2364 15.0238 7.73382 14.5638 8.00004"
          stroke="white"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_124_5943">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
