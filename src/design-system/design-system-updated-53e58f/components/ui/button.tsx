import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/design-system/design-system-updated-53e58f/lib/utils";

// Perficient buttons: radius 0, uppercase, 0.08em tracking, 1px border.
// Surface-aware coloring is handled in components.css via the cascade —
// `default` here applies .btn-primary and lets surfaces override.
const buttonVariants = cva("", {
  variants: {
    variant: {
      default: "btn-primary",
      link: "btn-link",
    },
    size: {
      default: "",
      sm: "text-xs px-4 py-2",
      lg: "text-base px-8 py-4",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };