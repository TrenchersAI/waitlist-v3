import type { SVGProps } from "react";

export default function ChevronDownIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.58588 8.00003L12.0001 18.4142L22.4143 8.00003L21.0001 6.58582L12.0001 15.5858L3.00009 6.58582L1.58588 8.00003Z"
        fill="currentColor"
      />
    </svg>
  );
}
