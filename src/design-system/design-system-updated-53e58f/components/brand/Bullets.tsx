import { cn } from "@/design-system/design-system-updated-53e58f/lib/utils";

export const Bullets = ({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) => (
  <ul className={cn("bullets", className)}>
    {items.map((t, i) => (
      <li key={i}>{t}</li>
    ))}
  </ul>
);