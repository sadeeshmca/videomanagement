import { cn } from "@/design-system/design-system-updated-53e58f/lib/utils";

export interface StatBlockProps {
  value: string | number;
  label: string;
  className?: string;
}

// Sanitizes the AI-typed multiplication sign U+00D7 (×) to ASCII x,
// per § typography prohibitions.
const sanitize = (v: string | number) => String(v).replace(/\u00D7/g, "x");

export const StatBlock = ({ value, label, className }: StatBlockProps) => (
  <div className={cn("flex flex-col gap-2", className)}>
    <span className="stat-number">{sanitize(value)}</span>
    <span className="stat-label">{label}</span>
  </div>
);