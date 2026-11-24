import { type ReactElement, type ReactNode } from "react";

/** The card a page shows in place of its content: not found, or failed to render. */
export function NoticePanel({ children }: { children: ReactNode }): ReactElement {
  return (
    <section className="flex oa-arrive flex-col items-start gap-3 oa-squircle bg-background-secondary-default p-6 shadow-card sm:p-10">
      {children}
    </section>
  );
}
