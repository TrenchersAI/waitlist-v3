import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/src/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-800 text-zinc-100 hover:bg-zinc-700/80",
        secondary: "border-transparent bg-zinc-800/60 text-zinc-300",
        success:
          "border-white/15 bg-white/[0.06] text-white/90",
        warning:
          "border-white/10 bg-transparent text-white/55",
        outline: "border-zinc-700 text-zinc-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
