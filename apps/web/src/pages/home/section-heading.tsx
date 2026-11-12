import { type ReactElement, type ReactNode } from "react";
import { LandingReveal } from "./reveal";

export function SectionHeading({ children }: { children: ReactNode }): ReactElement {
  return (
    <LandingReveal>
      <h2 className="mx-auto max-w-2xl text-center text-section-title tracking-tight text-balance text-text-primary">
        {children}
      </h2>
    </LandingReveal>
  );
}
