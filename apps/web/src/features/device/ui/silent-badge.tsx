import type { DeviceRead } from "@mtt/contracts";
import { type ReactElement } from "react";
import { Flag } from "@/components/flag";
import { deviceSilent } from "../model";

export type DeviceSilentBadgeProps = {
  device: Pick<DeviceRead, "last_seen" | "publish_interval_seconds">;
};

export function DeviceSilentBadge({ device }: DeviceSilentBadgeProps): ReactElement {
  return <Flag on={!deviceSilent(device)} yes="Live" no="Silent" onColor="lime" offColor="rose" />;
}
