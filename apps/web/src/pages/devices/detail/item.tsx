import type { ReactElement } from "react";

export function Item({ label, value }: { label: string; value: ReactElement | string }): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption-1-medium text-text-secondary">{label}</dt>
      <dd className="min-w-0 text-body-medium wrap-break-word text-text-primary">{value}</dd>
    </div>
  );
}
