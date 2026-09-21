import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Flag } from "@/components/flag";

export type DeviceAllowedBadgeProps = {
  allowed: boolean;
};

export function DeviceAllowedBadge({ allowed }: DeviceAllowedBadgeProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <Flag
      on={allowed}
      yes={formatMessage({ id: "feature.device.allowedBadge.yes", defaultMessage: "Allowed" })}
      no={formatMessage({ id: "feature.device.allowedBadge.no", defaultMessage: "Blocked" })}
      onColor="lime"
      offColor="rose"
    />
  );
}
