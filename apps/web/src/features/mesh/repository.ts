import {
  meshesCreateMutation,
  meshesDestroyMutation,
  meshesDevicesListOptions,
  meshesDevicesListQueryKey,
  meshesLinksListOptions,
  meshesListOptions,
  meshesListQueryKey,
  meshesRetrieveOptions,
  meshesRetrieveQueryKey,
  meshesTraceroutesListOptions,
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
  links: meshesLinksListOptions,
  traceroutes: meshesTraceroutesListOptions,
};
