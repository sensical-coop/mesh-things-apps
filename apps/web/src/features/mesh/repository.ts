import {
  meshesCreateMutation,
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
  devices: meshesDevicesListOptions,
  devicesKey: meshesDevicesListQueryKey,
};
