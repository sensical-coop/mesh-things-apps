import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Flag } from "@/components/flag";

export type DeviceLocationSourceBadgeProps = {
  overridden: boolean;
};

export function DeviceLocationSourceBadge({ overridden }: DeviceLocationSourceBadgeProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <Flag
      on={overridden}
      yes={formatMessage({ id: "feature.device.locationSource.manual", defaultMessage: "Set manually" })}
      no={formatMessage({ id: "feature.device.locationSource.node", defaultMessage: "Reported by the node" })}
      // Orange is free in the chip palette; cyan already means "gateway".
      onColor="orange"
    />
  );
}
