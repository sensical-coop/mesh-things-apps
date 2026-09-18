import {
  devicesCreateMutation,
  devicesListOptions,
  devicesListQueryKey,
  devicesMeasurementsListOptions,
  devicesRetrieveOptions,
  devicesRetrieveQueryKey,
  devicesTelemetryVariantsListOptions,
  devicesUpdateMutation,
} from "@mtt/contracts/query";

export const deviceRepository = {
  list: devicesListOptions,
  listKey: devicesListQueryKey,
  retrieve: devicesRetrieveOptions,
  retrieveKey: devicesRetrieveQueryKey,
  create: devicesCreateMutation,
  update: devicesUpdateMutation,
  measurements: devicesMeasurementsListOptions,
  telemetryVariants: devicesTelemetryVariantsListOptions,
};
