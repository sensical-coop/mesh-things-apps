import {
  measurementsListOptions,
  readingsDevicesLatestRetrieveOptions,
  readingsDevicesQualityRetrieveOptions,
  readingsDevicesRetrieveOptions,
  readingsMeshesStatsRetrieveOptions,
  telemetryVariantsMeasurementsListOptions,
} from "@mtt/contracts/query";

export const readingsRepository = {
  latest: readingsDevicesLatestRetrieveOptions,
  quality: readingsDevicesQualityRetrieveOptions,
  series: readingsDevicesRetrieveOptions,
  meshStats: readingsMeshesStatsRetrieveOptions,
  catalog: measurementsListOptions,
  variantMeasurements: telemetryVariantsMeasurementsListOptions,
};
