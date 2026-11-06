import { type ReactElement, type ReactNode, useCallback } from "react";

/** The step's title. It takes focus when the step mounts, so a screen reader announces the new step. */
export function StepHeading({ children }: { children: ReactNode }): ReactElement {
  const focus = useCallback((node: HTMLHeadingElement | null) => node?.focus({ preventScroll: true }), []);
  return (
    <h2 ref={focus} tabIndex={-1} className="text-title-2-medium text-balance text-text-primary outline-hidden">
      {children}
    </h2>
  );
}
