import { type ReactElement } from "react";
import { Flag } from "@/components/flag";

export type DeviceKindBadgeProps = {
  isGateway: boolean;
};

export function DeviceKindBadge({ isGateway }: DeviceKindBadgeProps): ReactElement {
  return <Flag on={isGateway} yes="Gateway" no="Node" />;
}
