import { Chip, type ChipProps } from "@mtt/ui/components/base/badges/chip";
import { cx } from "@mtt/ui/utils";
import { type ReactElement } from "react";

export type StatusChipProps = {
  tone: NonNullable<ChipProps["color"]>;
  label: string;
  title?: string;
  className?: string;
};

export function StatusChip({ tone, label, title, className }: StatusChipProps): ReactElement {
  return (
    <Chip variant="caption" color={tone} title={title} className={cx("rounded-full", className)}>
      {label}
    </Chip>
  );
}
