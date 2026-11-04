import {
  getDevicesPostprocessingsBackfillsCreateMutationOptions,
  getDevicesPostprocessingsBackfillsListQueryKey,
  getDevicesPostprocessingsBackfillsListQueryOptions,
  getDevicesPostprocessingsCalibrationsCreateMutationOptions,
  getDevicesPostprocessingsCalibrationsDestroyMutationOptions,
  getDevicesPostprocessingsCalibrationsListQueryKey,
  getDevicesPostprocessingsCalibrationsListQueryOptions,
  getDevicesPostprocessingsCreateMutationOptions,
  getDevicesPostprocessingsDestroyMutationOptions,
  getDevicesPostprocessingsListQueryKey,
  getDevicesPostprocessingsListQueryOptions,
  getDevicesPostprocessingsUpdateMutationOptions,
} from "@mtt/contracts/api";

/** Blueprints attached to one device: wiring, calibration history and backfills. */
export const postprocessingRepository = {
  list: getDevicesPostprocessingsListQueryOptions,
  listKey: getDevicesPostprocessingsListQueryKey,
  attach: getDevicesPostprocessingsCreateMutationOptions,
  update: getDevicesPostprocessingsUpdateMutationOptions,
  detach: getDevicesPostprocessingsDestroyMutationOptions,
  calibrations: getDevicesPostprocessingsCalibrationsListQueryOptions,
  calibrationsKey: getDevicesPostprocessingsCalibrationsListQueryKey,
  calibrate: getDevicesPostprocessingsCalibrationsCreateMutationOptions,
  removeCalibration: getDevicesPostprocessingsCalibrationsDestroyMutationOptions,
  backfills: getDevicesPostprocessingsBackfillsListQueryOptions,
  backfillsKey: getDevicesPostprocessingsBackfillsListQueryKey,
  backfill: getDevicesPostprocessingsBackfillsCreateMutationOptions,
};
