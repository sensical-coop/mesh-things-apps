import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { DeviceDot } from "@/features/device/ui/device-dot";

export function DeviceMapLegend(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <ul className="oa-squircle absolute top-3 left-3 z-10 flex items-center gap-3 bg-background-primary-default/90 px-3 py-1.5 shadow-card backdrop-blur-sm">
      <li className="flex items-center gap-1.5">
        <DeviceDot isGateway />
        <span className="text-caption-1-medium text-text-primary">
          {formatMessage({ id: "feature.device.kindBadge.gateway", defaultMessage: "Gateway" })}
        </span>
      </li>
      <li className="flex items-center gap-1.5">
        <DeviceDot isGateway={false} />
        <span className="text-caption-1-medium text-text-primary">
          {formatMessage({ id: "feature.device.kindBadge.node", defaultMessage: "Node" })}
        </span>
      </li>
    </ul>
  );
}
