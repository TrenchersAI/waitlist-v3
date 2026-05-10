import type { SVGProps } from "react";
import * as React from "react";

export default function SolanaIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  const uid = React.useId().replace(/:/g, "");
  const paint0 = `paint0_linear_sol_${uid}`;
  const paint1 = `paint1_linear_sol_${uid}`;
  const paint2 = `paint2_linear_sol_${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        d="M18.413 7.90196C18.3007 8.00496 18.1544 8.06298 18.002 8.06496H3.57999C3.06799 8.06496 2.80999 7.47996 3.16399 7.13696L5.53299 4.85296C5.64306 4.74633 5.78976 4.68587 5.94299 4.68396H20.42C20.937 4.68396 21.19 5.27396 20.83 5.61896L18.413 7.90196Z"
        fill={`url(#${paint0})`}
      />
      <path
        d="M18.413 19.1579C18.2999 19.2591 18.1537 19.3153 18.002 19.3159H3.57999C3.06799 19.3159 2.80999 18.7359 3.16399 18.3929L5.53299 16.1029C5.644 15.9985 5.79058 15.9402 5.94299 15.9399H20.42C20.937 15.9399 21.19 16.5259 20.83 16.8679L18.413 19.1579Z"
        fill={`url(#${paint1})`}
      />
      <path
        d="M18.413 10.4729C18.2999 10.3718 18.1537 10.3155 18.002 10.3149H3.57999C3.06799 10.3149 2.80999 10.8949 3.16399 11.2379L5.53299 13.5279C5.64399 13.6309 5.78999 13.6879 5.94299 13.6909H20.42C20.937 13.6909 21.19 13.1049 20.83 12.7629L18.413 10.4729Z"
        fill={`url(#${paint2})`}
      />
      <defs>
        <linearGradient
          id={paint0}
          x1="3.00099"
          y1="55.041"
          x2="21.459"
          y2="54.871"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#599DB0" />
          <stop offset="1" stopColor="#47F8C3" />
        </linearGradient>
        <linearGradient
          id={paint1}
          x1="3.00099"
          y1="9.16794"
          x2="21.341"
          y2="9.02694"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C44FE2" />
          <stop offset="1" stopColor="#73B0D0" />
        </linearGradient>
        <linearGradient
          id={paint2}
          x1="4.03599"
          y1="12.0029"
          x2="20.303"
          y2="12.0029"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#778CBF" />
          <stop offset="1" stopColor="#5DCDC9" />
        </linearGradient>
      </defs>
    </svg>
  );
}
