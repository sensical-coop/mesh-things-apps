import { type ReactElement } from "react";
import { Flag } from "@/components/flag";

export type DeviceAllowedBadgeProps = {
  allowed: boolean;
};

export function DeviceAllowedBadge({ allowed }: DeviceAllowedBadgeProps): ReactElement {
  return <Flag on={allowed} yes="Allowed" no="Blocked" onColor="lime" offColor="rose" />;
}
