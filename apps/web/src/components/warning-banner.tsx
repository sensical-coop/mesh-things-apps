import { RiErrorWarningLine } from "@remixicon/react";
import { type ReactElement, type ReactNode } from "react";

export type WarningBannerProps = {
  title: string;
  children: ReactNode;
  /** A button or link that resolves the warning. */
  action?: ReactNode;
};

/** A page-level warning: something on the page needs the owner's attention. */
export function WarningBanner({ title, children, action }: WarningBannerProps): ReactElement {
  return (
    <div
      role="alert"
      className="oa-squircle mb-6 flex flex-wrap items-start justify-between gap-3 border border-warning-border bg-warning-background px-4 py-3"
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <RiErrorWarningLine className="mt-0.5 size-5 shrink-0 text-status-yellow-text" aria-hidden />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-body-medium text-status-yellow-text">{title}</p>
          <div className="text-body-regular text-text-primary">{children}</div>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
