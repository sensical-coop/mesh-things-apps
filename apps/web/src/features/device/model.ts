import type { DeviceRead } from "@mtt/contracts";

export function deviceTitle(device: DeviceRead): string {
  return device.name?.trim() || device.label?.trim() || `Node ${device.node_id}`;
}

export function deviceRoleLabel(device: Pick<DeviceRead, "role" | "is_gateway">): string {
  const role = device.role?.trim();
  if (!role) return device.is_gateway ? "Gateway" : "Node";
  const words = role.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function deviceSilent(
  device: Pick<DeviceRead, "last_seen" | "publish_interval_seconds">,
  nowMs = Date.now(),
  missed = 3,
): boolean {
  if (!device.last_seen) return true;
  const intervalMs =
    (device.publish_interval_seconds && device.publish_interval_seconds > 0
      ? device.publish_interval_seconds
      : 300) * 1000;
  const seen = Date.parse(device.last_seen);
  if (!Number.isFinite(seen)) return true;
  return seen + missed * intervalMs < nowMs;
}
