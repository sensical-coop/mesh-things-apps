import type { DeviceRead } from "@mtt/contracts";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Flag } from "@/components/flag";
import { deviceSilent } from "../model";

export type DeviceSilentBadgeProps = {
  device: Pick<DeviceRead, "last_seen" | "publish_interval_seconds">;
};

export function DeviceSilentBadge({ device }: DeviceSilentBadgeProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <Flag
      on={!deviceSilent(device)}
      yes={formatMessage({ id: "feature.device.silentBadge.live", defaultMessage: "Live" })}
      no={formatMessage({ id: "feature.device.silentBadge.silent", defaultMessage: "Silent" })}
      onColor="lime"
      offColor="rose"
    />
  );
}
