import {
  devicesPostprocessingsBackfillsCreateMutation,
  devicesPostprocessingsBackfillsListOptions,
  devicesPostprocessingsBackfillsListQueryKey,
  devicesPostprocessingsCalibrationsCreateMutation,
  devicesPostprocessingsCalibrationsDestroyMutation,
  devicesPostprocessingsCalibrationsListOptions,
  devicesPostprocessingsCalibrationsListQueryKey,
  devicesPostprocessingsCreateMutation,
  devicesPostprocessingsDestroyMutation,
  devicesPostprocessingsListOptions,
  devicesPostprocessingsListQueryKey,
  devicesPostprocessingsUpdateMutation,
} from "@mtt/contracts/query";

/** Blueprints attached to one device: wiring, calibration history and backfills. */
export const postprocessingRepository = {
  list: devicesPostprocessingsListOptions,
  listKey: devicesPostprocessingsListQueryKey,
  attach: devicesPostprocessingsCreateMutation,
  update: devicesPostprocessingsUpdateMutation,
  detach: devicesPostprocessingsDestroyMutation,
  calibrations: devicesPostprocessingsCalibrationsListOptions,
  calibrationsKey: devicesPostprocessingsCalibrationsListQueryKey,
  calibrate: devicesPostprocessingsCalibrationsCreateMutation,
  removeCalibration: devicesPostprocessingsCalibrationsDestroyMutation,
  backfills: devicesPostprocessingsBackfillsListOptions,
  backfillsKey: devicesPostprocessingsBackfillsListQueryKey,
  backfill: devicesPostprocessingsBackfillsCreateMutation,
};
