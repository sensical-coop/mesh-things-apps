import {
  meshesCreateMutation,
  meshesDestroyMutation,
  meshesDevicesListOptions,
  meshesDevicesListQueryKey,
  meshesListOptions,
  meshesListQueryKey,
  meshesRetrieveOptions,
  meshesRetrieveQueryKey,
  meshesUpdateMutation,
} from "@mtt/contracts/query";

export const meshRepository = {
  list: meshesListOptions,
  listKey: meshesListQueryKey,
  retrieve: meshesRetrieveOptions,
  retrieveKey: meshesRetrieveQueryKey,
  create: meshesCreateMutation,
  update: meshesUpdateMutation,
  destroy: meshesDestroyMutation,
  devices: meshesDevicesListOptions,
  devicesKey: meshesDevicesListQueryKey,
};
