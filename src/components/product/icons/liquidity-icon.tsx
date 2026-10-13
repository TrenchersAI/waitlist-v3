import type { SVGProps } from "react";

export default function LiquidityIcon({
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
      <path
        d="M2.66663 9.33341C2.66663 5.67741 7.99996 0.916748 7.99996 0.916748C7.99996 0.916748 13.3333 5.66675 13.3333 9.33341C13.3333 12.7334 10.6 14.6667 7.99996 14.6667C5.39996 14.6667 2.66663 12.7334 2.66663 9.33341Z"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeLinecap="square"
      />
      <path
        d="M8.00004 11.9999C6.92804 11.9999 5.33337 11.2899 5.33337 9.33325"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeLinecap="square"
      />
    </svg>
  );
}
