import type { SVGProps } from "react";

export default function TotalBalanceIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        d="M3.79102 5.83333H2.62435V9.91666H3.79102V5.83333ZM7.29102 5.83333H6.12435V9.91666H7.29102V5.83333ZM12.2493 11.0833H1.16602V12.25H12.2493V11.0833ZM10.791 5.83333H9.62435V9.91666H10.791V5.83333ZM6.70768 1.90166L9.74685 3.49999H3.66852L6.70768 1.90166ZM6.70768 0.583328L1.16602 3.49999V4.66666H12.2493V3.49999L6.70768 0.583328Z"
        fill="currentColor"
      />
    </svg>
  );
}
