import type { ReactElement, ReactNode } from "react";

/**
 * A step with its figure on the left and the step content on the right; stacked on narrow screens.
 * Content comes first in the DOM so the heading is read and focused before the figure's controls.
 * `footer` spans both columns on wide screens, so long text such as the terms wraps in fewer lines;
 * on narrow screens it follows the content, before the figure, so the task is not split by it.
 * Both columns stretch to the taller one, so a step can pin its button to the figure's bottom edge (`lg:mt-auto`).
 */
export function StepLayout({
  figure,
  footer,
  children,
}: {
  figure: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="grid gap-6 text-pretty lg:grid-cols-2 lg:gap-8">
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
      {footer ? (
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-2 lg:border-t lg:border-separator-border lg:pt-6">
          {footer}
        </div>
      ) : null}
      <div className="min-w-0 lg:order-first">{figure}</div>
    </div>
  );
}
