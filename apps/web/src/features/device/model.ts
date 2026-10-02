import type { DeviceRead } from "@mtt/contracts";

export function deviceTitle(device: DeviceRead): string {
  return device.name?.trim() || device.label?.trim() || `Node ${device.node_id}`;
}

const KNOWN_DEVICE_ROLES = [
  "client",
  "client_mute",
  "client_hidden",
  "router",
  "router_client",
  "router_late",
  "repeater",
  "tracker",
  "sensor",
  "tak",
  "tak_tracker",
  "lost_and_found",
] as const;

export type DeviceRoleLabels = Record<(typeof KNOWN_DEVICE_ROLES)[number], string> & {
  gateway: string;
  node: string;
};

export const EN_DEVICE_ROLE_LABELS: DeviceRoleLabels = {
  client: "Client",
  client_mute: "Client mute",
  client_hidden: "Client hidden",
  router: "Router",
  router_client: "Router client",
  router_late: "Router late",
  repeater: "Repeater",
  tracker: "Tracker",
  sensor: "Sensor",
  tak: "TAK",
  tak_tracker: "TAK tracker",
  lost_and_found: "Lost and found",
  gateway: "Gateway",
  node: "Node",
};

export function deviceRoleLabel(
  device: Pick<DeviceRead, "role" | "is_gateway">,
  labels: DeviceRoleLabels = EN_DEVICE_ROLE_LABELS,
): string {
  const role = device.role?.trim();
  if (!role) return device.is_gateway ? labels.gateway : labels.node;
  const key = role.toLowerCase();
  if (KNOWN_DEVICE_ROLES.includes(key as (typeof KNOWN_DEVICE_ROLES)[number])) {
    return labels[key as (typeof KNOWN_DEVICE_ROLES)[number]];
  }
  const words = role.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function deviceSilent(
  device: Pick<DeviceRead, "last_seen" | "publish_interval_seconds">,
  nowMs = Date.now(),
  missed = 5,
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

export type CoordinateParse = { ok: true; value: number | null } | { ok: false };

// Free-text on purpose: a locale-aware number field reads "41.38" as 4138 in
// Spanish. Either separator is accepted as the decimal mark; thousands
// separators never appear in a coordinate.
export function parseCoordinate(raw: string, limit: 90 | 180): CoordinateParse {
  const text = raw.trim().replace(",", ".");
  if (text === "") return { ok: true, value: null };
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(text)) return { ok: false };
  const value = Number(text);
  if (!Number.isFinite(value) || Math.abs(value) > limit) return { ok: false };
  return { ok: true, value };
}

// Six decimals is ~0.1 m, finer than any GPS fix a node reports.
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
