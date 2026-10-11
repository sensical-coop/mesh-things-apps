import {
  measurementsListOptions,
  readingsDevicesLatestRetrieveOptions,
  readingsDevicesQualityRetrieveOptions,
  readingsDevicesRetrieveOptions,
  readingsDevicesTrafficRetrieveOptions,
  readingsMeshesStatsRetrieveOptions,
  telemetryVariantsMeasurementsListOptions,
} from "@mtt/contracts/query";

export const readingsRepository = {
  latest: readingsDevicesLatestRetrieveOptions,
  quality: readingsDevicesQualityRetrieveOptions,
  series: readingsDevicesRetrieveOptions,
  meshStats: readingsMeshesStatsRetrieveOptions,
  deviceTraffic: readingsDevicesTrafficRetrieveOptions,
  catalog: measurementsListOptions,
  variantMeasurements: telemetryVariantsMeasurementsListOptions,
};
