import { cx } from "@mtt/ui/utils";
import { type ReactElement, type ReactNode } from "react";
import { pageHeadingClass } from "@/lib/page-heading";

type DetailHeadingProps = {
  /** Sits before the heading block, e.g. a back button. */
  leading?: ReactNode;
  /** A link to the list this page belongs to. */
  crumb?: ReactNode;
  title: ReactNode;
  badges?: ReactNode;
  /** A line under the title. */
  note?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** The heading every detail page opens with: breadcrumb, title with its badges, and the page's actions. */
export function DetailHeading({ leading, crumb, title, badges, note, actions, className }: DetailHeadingProps): ReactElement {
  const heading = (
    <div className="flex min-w-0 flex-col gap-1">
      {crumb ? <p className="text-caption-1-regular text-text-secondary [&>a:hover]:text-text-primary">{crumb}</p> : null}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-balance wrap-break-word text-text-primary">{title}</h1>
        {badges}
      </div>
      {note}
    </div>
  );
  return (
    <div className={cx(pageHeadingClass, className)}>
      {leading ? (
        <div className="flex min-w-0 items-center gap-4">
          {leading}
          {heading}
        </div>
      ) : (
        heading
      )}
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
