import { Fragment } from "react";
import { cn } from "@/design-system/design-system-updated-53e58f/lib/utils";

export interface Step {
  title: string;
  body: string;
}

export interface StepCardsProps {
  steps: [Step, Step, Step];
  className?: string;
  /** Color of the mandatory gutter between cards. */
  gutter?: "white" | "sky" | "light";
}

const gutterClass: Record<NonNullable<StepCardsProps["gutter"]>, string> = {
  white: "bg-white",
  sky: "bg-sky",
  light: "bg-light-gray",
};

export const StepCards = ({ steps, className, gutter = "white" }: StepCardsProps) => (
  <div className={cn("grid grid-cols-1 md:grid-cols-[1fr_16px_1fr_16px_1fr]", className)}>
    {steps.map((s, i) => (
      <Fragment key={i}>
        <div className={`step-card step-card--${i + 1}`}>
          <div className="stat-label mb-2">Step {i + 1}</div>
          <h3 className="card-title">{s.title}</h3>
          <p className="mt-3">{s.body}</p>
        </div>
        {i < steps.length - 1 && (
          <div className={cn("hidden md:block", gutterClass[gutter])} />
        )}
      </Fragment>
    ))}
  </div>
);