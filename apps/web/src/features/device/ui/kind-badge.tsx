import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Flag } from "@/components/flag";

export type DeviceKindBadgeProps = {
  isGateway: boolean;
};

export function DeviceKindBadge({ isGateway }: DeviceKindBadgeProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <Flag
      on={isGateway}
      yes={formatMessage({ id: "feature.device.kindBadge.gateway", defaultMessage: "Gateway" })}
      no={formatMessage({ id: "feature.device.kindBadge.node", defaultMessage: "Node" })}
    />
  );
}
