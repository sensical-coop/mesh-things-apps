import { matchesListFilters, type ListFilter } from "@mtt/contracts/list-filter";
import { matchesDeviceFilter, type Device, type DeviceListFilter } from "@mtt/domain/device/Device";

/** Scalar fields plus the list-filter wire (`operator:v1|v2`), which stays out of domain. */
export type DeviceListQuery = DeviceListFilter & { extra?: ListFilter[] };

const DEVICE_WIRE_FIELDS: { wire: string; read: (device: Device) => string | boolean }[] = [
  { wire: "mesh_id", read: (device) => device.meshId },
  { wire: "is_gateway", read: (device) => device.isGateway },
  { wire: "is_allowed", read: (device) => device.isAllowed },
  { wire: "has_postprocessing", read: (device) => device.hasPostprocessing() },
  { wire: "label", read: (device) => device.label ?? "" },
];

export const deviceListFilterFields = DEVICE_WIRE_FIELDS.map((row) => row.wire);

function deviceFilterValue(device: Device, field: string): string | undefined {
  const found = DEVICE_WIRE_FIELDS.find((row) => row.wire === field);
  if (!found) return undefined;
  const value = found.read(device);
  return typeof value === "string" ? value : String(value);
}

export function matchesDeviceQuery(device: Device, filters?: DeviceListQuery): boolean {
  if (!matchesDeviceFilter(device, filters)) return false;
  if (!filters?.extra?.length) return true;
  return matchesListFilters((field) => deviceFilterValue(device, field), filters.extra);
}
