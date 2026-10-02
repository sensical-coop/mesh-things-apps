import {
  devicesCreateMutation,
  devicesListOptions,
  devicesListQueryKey,
  devicesMeasurementsListOptions,
  devicesMeasurementsListQueryKey,
  devicesMeasurementsRetrieveOptions,
  devicesMeasurementsRetrieveQueryKey,
  devicesMeasurementsUpdateMutation,
  devicesRetrieveOptions,
  devicesRetrieveQueryKey,
  devicesTelemetryVariantsListOptions,
  devicesUpdateMutation,
  telemetryVariantsListOptions,
} from "@mtt/contracts/query";

export const deviceRepository = {
  list: devicesListOptions,
  listKey: devicesListQueryKey,
  retrieve: devicesRetrieveOptions,
  retrieveKey: devicesRetrieveQueryKey,
  create: devicesCreateMutation,
  update: devicesUpdateMutation,
  measurements: devicesMeasurementsListOptions,
  measurementsKey: devicesMeasurementsListQueryKey,
  measurement: devicesMeasurementsRetrieveOptions,
  measurementKey: devicesMeasurementsRetrieveQueryKey,
  measurementUpdate: devicesMeasurementsUpdateMutation,
  telemetryVariants: devicesTelemetryVariantsListOptions,
  /** Every telemetry variant any device has reported. Needs a signed-in, verified owner. */
  variantCatalog: telemetryVariantsListOptions,
};
