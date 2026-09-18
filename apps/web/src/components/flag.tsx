import { Chip, type ChipProps } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";

export function Flag({
  on,
  yes,
  no,
  onColor = "cyan",
  offColor = "soft",
}: {
  on: boolean;
  yes: string;
  no: string;
  onColor?: ChipProps["color"];
  offColor?: ChipProps["color"];
}): ReactElement {
  return (
    <Chip variant="caption" color={on ? onColor : offColor} className="rounded-full">
      {on ? yes : no}
    </Chip>
  );
}
