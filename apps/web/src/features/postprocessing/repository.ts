import { deviceRepository } from "@/features/device/repository";
import { blueprintRepository } from "@/features/blueprint/repository";
import type { QueryClient } from "@tanstack/react-query";
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

/** A device's postprocessing changed: refresh what it feeds (its list, outputs, device row, blueprint counts). */
export async function invalidatePostprocessing(queryClient: QueryClient, deviceUuid: string): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: postprocessingRepository.listKey(deviceUuid) });
  await queryClient.invalidateQueries({ queryKey: deviceRepository.measurementsKey(deviceUuid) });
  await queryClient.invalidateQueries({ queryKey: deviceRepository.retrieveKey(deviceUuid) });
  await queryClient.invalidateQueries({ queryKey: blueprintRepository.listKey() });
}
