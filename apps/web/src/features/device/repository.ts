import {
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
  measurements: getDevicesMeasurementsListQueryOptions,
  measurementsKey: getDevicesMeasurementsListQueryKey,
  measurement: getDevicesMeasurementsRetrieveQueryOptions,
  measurementKey: getDevicesMeasurementsRetrieveQueryKey,
  measurementUpdate: getDevicesMeasurementsUpdateMutationOptions,
  telemetryVariants: getDevicesTelemetryVariantsListQueryOptions,
  /** Every telemetry variant any device has reported. Needs a signed-in, verified owner. */
  variantCatalog: getTelemetryVariantsListQueryOptions,
};
