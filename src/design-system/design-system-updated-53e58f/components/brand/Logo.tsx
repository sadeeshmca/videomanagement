import { cn } from "@/design-system/design-system-updated-53e58f/lib/utils";

// Surface-aware Perficient logo. Renders the full-color SVG on light surfaces
// and the white knockout on dark surfaces. NEVER typeset the word
// "Perficient" — always use this component.
export interface LogoProps {
  surface?: "light" | "dark";
  className?: string;
  /** Width in px. Enforced minimum is 100. */
  width?: number;
}

export const Logo = ({ surface = "light", className, width = 140 }: LogoProps) => {
  const enforced = Math.max(100, width);
  const src = "/assets/logo.webp";
  return (
    <img
      src={src}
      alt="Perficient"
      width={enforced}
      className={cn("block", className)}
      style={{ minWidth: 100, height: "auto" }}
    />
  );
};