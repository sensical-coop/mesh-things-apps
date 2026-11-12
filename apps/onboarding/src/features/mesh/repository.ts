import {
  getMeshesCreateMutationOptions,
  getMeshesDevicesListQueryKey,
  getMeshesDevicesListQueryOptions,
  getMeshesRetrieveQueryOptions,
  getProtocolsListQueryOptions,
} from "@mtt/contracts/api";

export const meshRepository = {
  retrieve: getMeshesRetrieveQueryOptions,
  create: getMeshesCreateMutationOptions,
  devices: getMeshesDevicesListQueryOptions,
  devicesKey: getMeshesDevicesListQueryKey,
  protocols: getProtocolsListQueryOptions,
};
