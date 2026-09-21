import { NIL_BLUEPRINT_ID } from "../shared/blueprint";
import { matchesListFilters, type ListFilter } from "../shared/list-filter";

export type DeviceProps = {
  uuid: string;
  nodeId: number;
  meshId: string;
  label: string | null;
  isGateway: boolean;
  isAllowed: boolean;
  absenceDetectionEnabled: boolean;
  adminKeysB64: string[];
  latitude: number | null;
  longitude: number | null;
  locationOverridden: boolean;
  name: string | null;
  shortName: string | null;
  hardwareType: string | null;
  role: string | null;
  nodeinfoOverridden: boolean;
  postprocessingBlueprintId: string | null;
  readingIntervalSeconds: number | null;
  publishIntervalSeconds: number | null;
  lastSeen: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeviceCreate = {
  nodeId: number;
  meshId: string;
  isGateway: boolean;
  label?: string | null;
  name?: string | null;
  shortName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type DeviceListFilter = {
  meshId?: string;
  isGateway?: boolean;
  isAllowed?: boolean;
  hasPostprocessing?: boolean;
  extra?: ListFilter[];
};

export class Device implements DeviceProps {
  readonly uuid: string;
  declare readonly nodeId: number;
  declare readonly meshId: string;
  label: string | null;
  isGateway: boolean;
  isAllowed: boolean;
  absenceDetectionEnabled: boolean;
  adminKeysB64: string[];
  latitude: number | null;
  longitude: number | null;
  locationOverridden: boolean;
  name: string | null;
  shortName: string | null;
  hardwareType: string | null;
  role: string | null;
  nodeinfoOverridden: boolean;
  postprocessingBlueprintId: string | null;
  readingIntervalSeconds: number | null;
  publishIntervalSeconds: number | null;
  lastSeen: string | null;
  readonly createdAt: string;
  updatedAt: string;

  constructor(props: DeviceProps) {
    this.uuid = props.uuid;
    Object.defineProperty(this, "nodeId", {
      value: props.nodeId,
      writable: false,
      enumerable: true,
      configurable: false,
    });
    Object.defineProperty(this, "meshId", {
      value: props.meshId,
      writable: false,
      enumerable: true,
      configurable: false,
    });
    this.label = props.label;
    this.isGateway = props.isGateway;
    this.isAllowed = props.isAllowed;
    this.absenceDetectionEnabled = props.absenceDetectionEnabled;
    this.adminKeysB64 = props.adminKeysB64;
    this.latitude = props.latitude;
    this.longitude = props.longitude;
    this.locationOverridden = props.locationOverridden;
    this.name = props.name;
    this.shortName = props.shortName;
    this.hardwareType = props.hardwareType;
    this.role = props.role;
    this.nodeinfoOverridden = props.nodeinfoOverridden;
    this.postprocessingBlueprintId = props.postprocessingBlueprintId;
    this.readingIntervalSeconds = props.readingIntervalSeconds;
    this.publishIntervalSeconds = props.publishIntervalSeconds;
    this.lastSeen = props.lastSeen;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  hasPostprocessing(): boolean {
    return (
      this.postprocessingBlueprintId !== null &&
      this.postprocessingBlueprintId !== NIL_BLUEPRINT_ID
    );
  }
}

export function deviceFilterValue(device: Device, field: string): string | undefined {
  switch (field) {
    case "mesh_id":
      return device.meshId;
    case "is_gateway":
      return String(device.isGateway);
    case "is_allowed":
      return String(device.isAllowed);
    case "has_postprocessing":
      return String(device.hasPostprocessing());
    case "label":
      return device.label ?? "";
    default:
      return undefined;
  }
}

export function matchesDeviceFilter(device: Device, filters?: DeviceListFilter): boolean {
  if (!filters) return true;
  if (filters.meshId !== undefined && device.meshId !== filters.meshId) return false;
  if (filters.isGateway !== undefined && device.isGateway !== filters.isGateway) return false;
  if (filters.isAllowed !== undefined && device.isAllowed !== filters.isAllowed) return false;
  if (filters.hasPostprocessing !== undefined && device.hasPostprocessing() !== filters.hasPostprocessing) {
    return false;
  }
  if (filters.extra?.length) {
    return matchesListFilters((field) => deviceFilterValue(device, field), filters.extra);
  }
  return true;
}
