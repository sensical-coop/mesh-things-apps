import { type ReactElement, type ReactNode } from "react";

export function StatusCopy({ children }: { children: ReactNode }): ReactElement {
  return (
    <p className="text-body-regular text-text-secondary" role="status">
      {children}
    </p>
  );
}
