import type { DeviceRead } from "@mtt/contracts";
import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export type DeviceProtocolBadgeProps = {
  device: Pick<DeviceRead, "protocol_mismatch">;
};

export function DeviceProtocolBadge({ device }: DeviceProtocolBadgeProps): ReactElement | null {
  const { formatMessage } = useIntl();
  if (!device.protocol_mismatch) return null;
  return (
    <Chip variant="caption" color="rose" className="rounded-full">
      {formatMessage({ id: "feature.device.protocolBadge.mismatch", defaultMessage: "Protocol mismatch" })}
    </Chip>
  );
}
