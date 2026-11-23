import type { DeviceRead } from "@mtt/contracts";
import { formatNodeId } from "@mtt/ui/forms/node-id";

/** Whether the device has published since it was registered. */
export function isSeen(device: Pick<DeviceRead, "last_seen">): boolean {
  return device.last_seen !== null;
}

/** Every device on a mesh except its gateway. */
export function nodesOf(devices: readonly DeviceRead[]): DeviceRead[] {
  return devices.filter((device) => !device.is_gateway);
}

/** The gateway's label, or its node ID in hex. */
export function gatewayTitle(device: Pick<DeviceRead, "label" | "node_id">): string {
  return device.label?.trim() || formatNodeId(device.node_id, "hex");
}
