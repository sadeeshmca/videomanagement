import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/design-system/design-system-updated-53e58f/lib/utils";

const badgeVariants = cva("chip", {
  variants: {
    variant: {
      default: "",
      strong: "chip-strong",
      dark: "chip-dark",
      alert: "chip-alert",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);