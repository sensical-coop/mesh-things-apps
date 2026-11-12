import type { ListFilter } from "@mtt/contracts/list-filter";
import type { Device } from "@mtt/domain/device/Device";
import { listFilterFields } from "../../list-filter";

/** The list-filter wire (`operator:v1|v2`) of `GET /devices`; `attached` is whether a blueprint is attached. */
const deviceFilters = listFilterFields<[Device, boolean]>([
  { wire: "mesh_id", read: (device) => device.meshId },
  { wire: "is_gateway", read: (device) => device.isGateway },
  { wire: "is_allowed", read: (device) => device.isAllowed },
  { wire: "has_postprocessing", read: (_device, attached) => attached },
  { wire: "label", read: (device) => device.label ?? "" },
]);

export const deviceListFilterFields = deviceFilters.names;

export function matchesDeviceFilters(device: Device, attached: boolean, filters: ListFilter[]): boolean {
  return deviceFilters.matches(filters, device, attached);
}
