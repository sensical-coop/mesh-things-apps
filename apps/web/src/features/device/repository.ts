import {
  devicesUpdate,
  getDevicesCreateMutationOptions,
  getDevicesListQueryKey,
  getDevicesListQueryOptions,
  getDevicesMeasurementsListQueryKey,
  getDevicesMeasurementsListQueryOptions,
  getDevicesMeasurementsRetrieveQueryKey,
  getDevicesMeasurementsRetrieveQueryOptions,
  getDevicesMeasurementsUpdateMutationOptions,
  getDevicesRetrieveQueryKey,
  getDevicesRetrieveQueryOptions,
  getDevicesTelemetryVariantsListQueryOptions,
  getDevicesUpdateMutationOptions,
  getTelemetryVariantsListQueryOptions,
} from "@mtt/contracts/api";

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
  measurement: getDevicesMeasurementsRetrieveQueryOptions,
  measurementKey: getDevicesMeasurementsRetrieveQueryKey,
  measurementUpdate: getDevicesMeasurementsUpdateMutationOptions,
  telemetryVariants: getDevicesTelemetryVariantsListQueryOptions,
  /** Every telemetry variant any device has reported. Needs a signed-in, verified owner. */
  variantCatalog: getTelemetryVariantsListQueryOptions,
};
