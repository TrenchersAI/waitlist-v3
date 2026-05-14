import * as React from "react";

import { cn } from "@/src/lib/utils";

/** Simple animated placeholder block. Renders an opaque rounded rectangle that
   pulses, sized via the className from the caller. Use to reserve the shape
   of content that's still loading so layout doesn't jump on swap-in. */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-md bg-white/[0.06]", className)}
      {...props}
    />
  );
}
