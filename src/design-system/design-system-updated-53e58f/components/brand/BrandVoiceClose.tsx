import { Logo } from "./Logo";
import { cn } from "@/design-system/design-system-updated-53e58f/lib/utils";

// The canonical Perficient sign-off mark.
// The tagline is a literal constant — NOT a prop — so it cannot be modified
// at the call site. See .lovable/system.md "HARD REFUSAL RULES" for the
// agent-level enforcement.
const TAGLINE = "Different. For real." as const;

export interface BrandVoiceCloseProps {
  surface?: "spruce" | "navy" | "black";
  /** Optional attribution line shown below the tagline. */
  attribution?: string;
  className?: string;
}

const surfaceClass: Record<NonNullable<BrandVoiceCloseProps["surface"]>, string> = {
  spruce: "bg-surface-spruce",
  navy: "bg-surface-navy",
  black: "bg-surface-black",
};

export const BrandVoiceClose = ({
  surface = "spruce",
  attribution,
  className,
}: BrandVoiceCloseProps) => (
  <section className={cn(surfaceClass[surface], "p-12 flex flex-col gap-8", className)}>
    <h2 className="h-section">
      <em>{TAGLINE}</em>
    </h2>
    {/* Per spec lint #11: no opacity on text — ever. Full opacity always. */}
    {attribution && <p className="text-fine">{attribution}</p>}
    <Logo surface="dark" width={140} />
  </section>
);