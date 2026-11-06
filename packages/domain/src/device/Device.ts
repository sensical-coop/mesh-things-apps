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
  /** Blueprints attached to this device (`DevicePostprocessing` rows). */
  postprocessingCount: number;
  readingIntervalSeconds: number | null;
  publishIntervalSeconds: number | null;
  /** Opt-in to the Parquet archive; applies only while the mesh's owner is an operator. */
  archiveEnabled?: boolean;
  /** Who switched it on and when; cleared when it is switched off. */
  archiveEnabledAt?: string | null;
  archiveEnabledBy?: string | null;
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
  postprocessingCount: number;
  readingIntervalSeconds: number | null;
  publishIntervalSeconds: number | null;
  archiveEnabled: boolean;
  archiveEnabledAt: string | null;
  archiveEnabledBy: string | null;
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
    this.postprocessingCount = props.postprocessingCount;
    this.readingIntervalSeconds = props.readingIntervalSeconds;
    this.publishIntervalSeconds = props.publishIntervalSeconds;
    this.archiveEnabled = props.archiveEnabled ?? false;
    this.archiveEnabledAt = props.archiveEnabledAt ?? null;
    this.archiveEnabledBy = props.archiveEnabledBy ?? null;
    this.lastSeen = props.lastSeen;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  hasPostprocessing(): boolean {
    return this.postprocessingCount > 0;
  }

  /** Switches the archive on or off, recording who switched it on. */
  setArchive(enabled: boolean, by: string, at: string): void {
    if (enabled === this.archiveEnabled) return;
    this.archiveEnabled = enabled;
    this.archiveEnabledAt = enabled ? at : null;
    this.archiveEnabledBy = enabled ? by : null;
  }
}

const DEVICE_FILTER_FIELDS: {
  wire: string;
  key?: keyof DeviceListFilter;
  read: (device: Device) => string | boolean;
}[] = [
  { wire: "mesh_id", key: "meshId", read: (device) => device.meshId },
  { wire: "is_gateway", key: "isGateway", read: (device) => device.isGateway },
  { wire: "is_allowed", key: "isAllowed", read: (device) => device.isAllowed },
  { wire: "has_postprocessing", key: "hasPostprocessing", read: (device) => device.hasPostprocessing() },
  { wire: "label", read: (device) => device.label ?? "" },
];

export function deviceFilterValue(device: Device, field: string): string | undefined {
  const found = DEVICE_FILTER_FIELDS.find((row) => row.wire === field);
  if (!found) return undefined;
  const value = found.read(device);
  return typeof value === "string" ? value : String(value);
}

export function matchesDeviceFilter(device: Device, filters?: DeviceListFilter): boolean {
  if (!filters) return true;
  return DEVICE_FILTER_FIELDS.every((row) => {
    if (!row.key) return true;
    const expected = filters[row.key];
    return expected === undefined || row.read(device) === expected;
  });
}
