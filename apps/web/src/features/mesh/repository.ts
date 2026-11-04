import {
  getMeshesCreateMutationOptions,
  getMeshesDestroyMutationOptions,
  getMeshesDevicesListQueryKey,
  getMeshesDevicesListQueryOptions,
  getMeshesLinksListQueryOptions,
  getMeshesListQueryKey,
  getMeshesListQueryOptions,
  getMeshesRetrieveQueryKey,
  getMeshesRetrieveQueryOptions,
  getMeshesTraceroutesListQueryOptions,
  getMeshesUpdateMutationOptions,
} from "@mtt/contracts/api";

export const meshRepository = {
  list: getMeshesListQueryOptions,
  listKey: getMeshesListQueryKey,
  retrieve: getMeshesRetrieveQueryOptions,
  retrieveKey: getMeshesRetrieveQueryKey,
  create: getMeshesCreateMutationOptions,
  update: getMeshesUpdateMutationOptions,
  destroy: getMeshesDestroyMutationOptions,
  devices: getMeshesDevicesListQueryOptions,
  devicesKey: getMeshesDevicesListQueryKey,
  links: getMeshesLinksListQueryOptions,
  traceroutes: getMeshesTraceroutesListQueryOptions,
};
