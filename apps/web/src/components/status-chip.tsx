import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";

type ChipColor = "accent" | "orange" | "lime" | "rose" | "yellow" | "cyan" | "blue" | "purple" | "neutral" | "gray" | "soft";

export type StatusChipProps = {
  tone: ChipColor;
  label: string;
  title?: string;
  className?: string;
};

export function StatusChip({ tone, label, title, className }: StatusChipProps): ReactElement {
  return (
    <Chip variant="caption" color={tone} title={title} className={className ? `rounded-full ${className}` : "rounded-full"}>
      {label}
    </Chip>
  );
}
