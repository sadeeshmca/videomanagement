import { cn } from "@/design-system/design-system-updated-53e58f/lib/utils";

// SVG arrow — used in place of Unicode arrow glyphs (→ ⟶ ➝ etc., all banned).
// Inherits currentColor so it works on every surface.
export interface ArrowProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
}
export const Arrow = ({ size = 24, className, ...props }: ArrowProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
    className={cn("inline-block", className)}
    {...props}
  >
    <defs>
      <marker id="perf-arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
      </marker>
    </defs>
    <line x1="2" y1="12" x2="20" y2="12" markerEnd="url(#perf-arrowhead)" />
  </svg>
);