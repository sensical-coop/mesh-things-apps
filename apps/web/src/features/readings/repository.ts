import {
  measurementsListOptions,
  readingsDevicesLatestRetrieveOptions,
  readingsDevicesQualityRetrieveOptions,
  readingsDevicesRetrieveOptions,
  telemetryVariantsMeasurementsListOptions,
} from "@mtt/contracts/query";

export const readingsRepository = {
  latest: readingsDevicesLatestRetrieveOptions,
  quality: readingsDevicesQualityRetrieveOptions,
  series: readingsDevicesRetrieveOptions,
  catalog: measurementsListOptions,
  variantMeasurements: telemetryVariantsMeasurementsListOptions,
};
