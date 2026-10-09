import { type ReactElement, type ReactNode } from "react";

export type RankedBar = {
  key: string;
  label: ReactNode;
  value: number;
  /** What the row shows on the right; the bar length always follows `value`. */
  display: string;
};

/** Horizontal bars scaled to the largest row, for ranked counts such as the busiest nodes. */
export function RankedBars({ rows, label }: { rows: RankedBar[]; label: string }): ReactElement {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="oa-arrive flex flex-col gap-2.5" aria-label={label}>
      {rows.map((row) => (
        <li key={row.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-body-2-regular">
            <span className="min-w-0 truncate text-text-primary">{row.label}</span>
            <span className="shrink-0 tabular-nums text-text-secondary">{row.display}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-background-secondary-default" aria-hidden>
            <div className="h-full rounded-full bg-accent-500" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
