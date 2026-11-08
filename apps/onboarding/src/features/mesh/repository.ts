import {
  getMeshesCreateMutationOptions,
  getMeshesDevicesListQueryKey,
  getMeshesDevicesListQueryOptions,
  getMeshesRetrieveQueryOptions,
} from "@mtt/contracts/api";

export const meshRepository = {
  retrieve: getMeshesRetrieveQueryOptions,
  create: getMeshesCreateMutationOptions,
  devices: getMeshesDevicesListQueryOptions,
  devicesKey: getMeshesDevicesListQueryKey,
};
