import {
  getMeasurementsListQueryOptions,
  getReadingsDevicesLatestRetrieveQueryOptions,
  getReadingsDevicesQualityRetrieveQueryOptions,
  getReadingsDevicesRetrieveQueryOptions,
  getReadingsDevicesTrafficRetrieveQueryOptions,
  getReadingsMeshesStatsRetrieveQueryOptions,
  getTelemetryVariantsMeasurementsListQueryOptions,
} from "@mtt/contracts/api";

export const readingsRepository = {
  latest: getReadingsDevicesLatestRetrieveQueryOptions,
  quality: getReadingsDevicesQualityRetrieveQueryOptions,
  series: getReadingsDevicesRetrieveQueryOptions,
  meshStats: getReadingsMeshesStatsRetrieveQueryOptions,
  deviceTraffic: getReadingsDevicesTrafficRetrieveQueryOptions,
  catalog: getMeasurementsListQueryOptions,
  variantMeasurements: getTelemetryVariantsMeasurementsListQueryOptions,
};
