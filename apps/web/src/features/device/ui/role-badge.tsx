import type { DeviceRead } from "@mtt/contracts";
import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { deviceRoleLabel } from "../model";

export type DeviceRoleBadgeProps = {
  device: Pick<DeviceRead, "role" | "is_gateway">;
};

export function DeviceRoleBadge({ device }: DeviceRoleBadgeProps): ReactElement {
  return (
    <Chip variant="caption" color={device.is_gateway ? "cyan" : "soft"} className="rounded-full">
      {deviceRoleLabel(device)}
    </Chip>
  );
}
