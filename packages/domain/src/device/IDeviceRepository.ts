import type { Device, DeviceCreate, DeviceListFilter } from "./Device";

export interface IDeviceRepository {
  list(filters?: DeviceListFilter): Promise<Device[]>;
  get(uuid: string): Promise<Device | null>;
  insert(input: DeviceCreate): Promise<Device>;
}
