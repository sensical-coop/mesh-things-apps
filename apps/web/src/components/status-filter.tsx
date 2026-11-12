import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export type StatusFilterProps<T extends string> = {
  /** The statuses to filter by; "all" is added after them. */
  statuses: readonly T[];
  value: T | "all";
  labels: Record<T, string>;
  onChange: (value: T | "all") => void;
};

export function StatusFilter<T extends string>({ statuses, value, labels, onChange }: StatusFilterProps<T>): ReactElement {
  const { formatMessage } = useIntl();
  const options: readonly (T | "all")[] = [...statuses, "all"];
  const label = (option: T | "all"): string =>
    option === "all" ? formatMessage({ id: "common.statusFilter.all", defaultMessage: "All" }) : labels[option];
  return (
    <div
      className="mb-4 flex flex-wrap gap-2"
      role="group"
      aria-label={formatMessage({ id: "common.statusFilter.label", defaultMessage: "Status" })}
    >
      {options.map((option) => (
        <Button
          key={option}
          type="button"
          size="xs"
          variant={value === option ? "primary" : "secondary"}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {label(option)}
        </Button>
      ))}
    </div>
  );
}
