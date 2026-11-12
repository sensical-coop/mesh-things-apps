import {
  devicesUpdate,
  getDevicesCreateMutationOptions,
  getDevicesListQueryKey,
  getDevicesListQueryOptions,
  getDevicesMeasurementsListQueryKey,
  getDevicesMeasurementsListQueryOptions,
  getDevicesMeasurementsUpdateMutationOptions,
  getDevicesRetrieveQueryKey,
  getDevicesRetrieveQueryOptions,
  getDevicesTelemetryVariantsListQueryOptions,
  getDevicesUpdateMutationOptions,
  getMeasurementsListQueryOptions,
  getTelemetryVariantsListQueryOptions,
} from "@mtt/contracts/api";
import type { DeviceRead } from "@mtt/contracts";
import type { QueryClient } from "@tanstack/react-query";
import { meshRepository } from "@/features/mesh/repository";

export const deviceRepository = {
  list: getDevicesListQueryOptions,
  listKey: getDevicesListQueryKey,
  retrieve: getDevicesRetrieveQueryOptions,
  retrieveKey: getDevicesRetrieveQueryKey,
  create: getDevicesCreateMutationOptions,
  update: getDevicesUpdateMutationOptions,
  /** One device's archive setting. A mesh-wide switch calls it per device; the API has no bulk route. */
  setDeviceArchive: (deviceUuid: string, enabled: boolean) => devicesUpdate(deviceUuid, { archive_enabled: enabled }),
  measurements: getDevicesMeasurementsListQueryOptions,
  measurementsKey: getDevicesMeasurementsListQueryKey,
  measurementUpdate: getDevicesMeasurementsUpdateMutationOptions,
  /** Every measurement type the registry knows, not only those a device reported. */
  measurementCatalog: getMeasurementsListQueryOptions,
  telemetryVariants: getDevicesTelemetryVariantsListQueryOptions,
  /** Every telemetry variant any device has reported. Needs a signed-in, verified owner. */
  variantCatalog: getTelemetryVariantsListQueryOptions,
};

/** Refresh every cache a device write can make stale: the device itself, device lists, and its mesh's device list. */
export function invalidateDevice(queryClient: QueryClient, device: Pick<DeviceRead, "uuid" | "mesh_id">): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: deviceRepository.listKey() }),
    queryClient.invalidateQueries({ queryKey: deviceRepository.retrieveKey(device.uuid) }),
    queryClient.invalidateQueries({ queryKey: meshRepository.devicesKey(device.mesh_id) }),
  ]);
}
