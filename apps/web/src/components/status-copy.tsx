import { type ReactElement, type ReactNode } from "react";
import { cx } from "@mtt/ui/utils";

export function StatusCopy({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <p className={cx("text-body-regular text-text-secondary", className)} role="status">
      {children}
    </p>
  );
}
