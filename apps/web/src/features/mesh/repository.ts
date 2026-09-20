import {
  meshesCreateMutation,
  meshesDestroyMutation,
  meshesDevicesListOptions,
  meshesDevicesListQueryKey,
  meshesListOptions,
  meshesListQueryKey,
  meshesRetrieveOptions,
} from "@mtt/contracts/query";

export const meshRepository = {
  list: meshesListOptions,
  listKey: meshesListQueryKey,
  retrieve: meshesRetrieveOptions,
  create: meshesCreateMutation,
  destroy: meshesDestroyMutation,
  devices: meshesDevicesListOptions,
  devicesKey: meshesDevicesListQueryKey,
};
