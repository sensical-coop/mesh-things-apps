import { type ReactElement } from "react";

export function SkeletonRows({ rows = 3 }: { rows?: number }): ReactElement {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-5 rounded-full bg-background-tertiary-default" />
      ))}
    </div>
  );
}
