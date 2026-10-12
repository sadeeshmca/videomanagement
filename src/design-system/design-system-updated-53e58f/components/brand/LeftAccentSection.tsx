import { cn } from "@/design-system/design-system-updated-53e58f/lib/utils";

export const LeftAccentSection = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("left-accent", className)} {...props}>
    {children}
  </div>
);