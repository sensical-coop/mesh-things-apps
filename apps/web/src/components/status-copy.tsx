import { type ReactElement, type ReactNode } from "react";
import { cn } from "@mtt/ui/lib/utils";

export function StatusCopy({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <p className={cn("text-body-regular text-text-secondary", className)} role="status">
      {children}
    </p>
  );
}
