import { matchesListFilters, type ListFilter } from "@mtt/contracts/list-filter";
import { deviceFilterValue, matchesDeviceFilter, type Device, type DeviceListFilter } from "@mtt/domain/device/Device";

/** Scalar fields plus the list-filter wire (`operator:v1|v2`), which stays out of domain. */
export type DeviceListQuery = DeviceListFilter & { extra?: ListFilter[] };

export function matchesDeviceQuery(device: Device, filters?: DeviceListQuery): boolean {
  if (!matchesDeviceFilter(device, filters)) return false;
  if (!filters?.extra?.length) return true;
  return matchesListFilters((field) => deviceFilterValue(device, field), filters.extra);
}
