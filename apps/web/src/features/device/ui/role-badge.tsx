import type { DeviceRead } from "@mtt/contracts";
import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { deviceRoleLabel, type DeviceRoleLabels } from "../model";

export type DeviceRoleBadgeProps = {
  device: Pick<DeviceRead, "role" | "is_gateway">;
};

export function DeviceRoleBadge({ device }: DeviceRoleBadgeProps): ReactElement {
  const { formatMessage } = useIntl();
  const labels: DeviceRoleLabels = {
    client: formatMessage({ id: "feature.device.role.client", defaultMessage: "Client" }),
    client_mute: formatMessage({ id: "feature.device.role.clientMute", defaultMessage: "Client mute" }),
    client_hidden: formatMessage({ id: "feature.device.role.clientHidden", defaultMessage: "Client hidden" }),
    router: formatMessage({ id: "feature.device.role.router", defaultMessage: "Router" }),
    router_client: formatMessage({ id: "feature.device.role.routerClient", defaultMessage: "Router client" }),
    router_late: formatMessage({ id: "feature.device.role.routerLate", defaultMessage: "Router late" }),
    repeater: formatMessage({ id: "feature.device.role.repeater", defaultMessage: "Repeater" }),
    tracker: formatMessage({ id: "feature.device.role.tracker", defaultMessage: "Tracker" }),
    sensor: formatMessage({ id: "feature.device.role.sensor", defaultMessage: "Sensor" }),
    tak: formatMessage({ id: "feature.device.role.tak", defaultMessage: "TAK" }),
    tak_tracker: formatMessage({ id: "feature.device.role.takTracker", defaultMessage: "TAK tracker" }),
    lost_and_found: formatMessage({ id: "feature.device.role.lostAndFound", defaultMessage: "Lost and found" }),
    gateway: formatMessage({ id: "feature.device.role.gateway", defaultMessage: "Gateway" }),
    node: formatMessage({ id: "feature.device.role.node", defaultMessage: "Node" }),
  };
  return (
    <Chip variant="caption" color={device.is_gateway ? "cyan" : "accent"} className="rounded-full">
      {deviceRoleLabel(device, labels)}
    </Chip>
  );
}
