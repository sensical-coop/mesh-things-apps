import type { Device, DeviceCreate, DeviceListFilter } from "./Device";

export type DevicePatch = Partial<DeviceCreate> & {
  isAllowed?: boolean;
  absenceDetectionEnabled?: boolean;
  readingIntervalSeconds?: number | null;
  publishIntervalSeconds?: number | null;
  locationOverridden?: boolean;
};

export interface IDeviceRepository {
  list(filters?: DeviceListFilter): Promise<Device[]>;
  get(uuid: string): Promise<Device | null>;
  insert(input: DeviceCreate): Promise<Device>;
  update(uuid: string, patch: DevicePatch): Promise<Device | null>;
  delete(uuid: string): Promise<boolean>;
}
