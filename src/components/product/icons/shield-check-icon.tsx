import clsx from "clsx";
import type { SVGProps } from "react";

/** Shield with checkmark — recommended settings bullets. */
export default function ShieldCheckIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={clsx("size-4 shrink-0", className)}
      aria-hidden
      {...props}
    >
      <path
        d="M20.3777 12.9014L21 4.5L20.4499 4.445C17.508 4.1508 14.6445 3.32223 12 2C9.35553 3.32223 6.49199 4.1508 3.55006 4.44499L3 4.5L3.62236 12.9014C3.85658 16.0632 5.73712 18.8685 8.57285 20.2864L12.0001 22L15.4272 20.2864C18.263 18.8685 20.1435 16.0632 20.3777 12.9014Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeMiterlimit="10"
        strokeLinecap="square"
      />
      <path
        d="M9 12L11 14L16 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeMiterlimit="10"
        strokeLinecap="square"
      />
    </svg>
  );
}
