import type { SVGProps } from "react";

export default function AboutToMigrateIcon({
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
        d="M3.33331 14.6667H12.6666M3.33331 1.33337H12.6666M11.3333 14.6667V11.8854C11.3332 11.5318 11.1927 11.1927 10.9426 10.9427L7.99998 8.00004M7.99998 8.00004L5.05731 10.9427C4.80725 11.1927 4.66672 11.5318 4.66665 11.8854V14.6667M7.99998 8.00004L5.05731 5.05737C4.80725 4.80738 4.66672 4.4683 4.66665 4.11471V1.33337M7.99998 8.00004L10.9426 5.05737C11.1927 4.80738 11.3332 4.4683 11.3333 4.11471V1.33337"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
