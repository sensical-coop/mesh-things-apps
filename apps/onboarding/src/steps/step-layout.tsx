import type { ReactElement, ReactNode } from "react";

/** Content is first in the DOM so the heading is focused before the figure's controls. */
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
