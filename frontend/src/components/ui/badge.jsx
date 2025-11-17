import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow transition-colors focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[#f1e8d3] text-[#b48b00] border-[#e6d48f] ",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow",
        outline:
          "text-foreground border border-[#e6d48f] ",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
