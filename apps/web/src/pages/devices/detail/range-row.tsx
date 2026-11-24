import { cx } from "@mtt/ui/utils";
import type { ReactElement } from "react";

export function RangeRow({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: string;
}): ReactElement {
  return (
    <button
      type="button"
      className={cx(
        "flex h-8 w-full items-center rounded-lg px-3 text-left text-body-regular text-text-primary outline-hidden",
        "hover:bg-background-primary-hover",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        selected && "bg-background-secondary-default",
      )}
      aria-current={selected || undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
