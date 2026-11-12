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
  getProtocolsListQueryOptions,
} from "@mtt/contracts/api";
import { whenId } from "@/lib/query-when-id";

export const meshRepository = {
  list: getMeshesListQueryOptions,
  listKey: getMeshesListQueryKey,
  retrieve: (meshId: string | null | undefined) =>
    whenId(meshId, ["meshes", "none"], (id) => getMeshesRetrieveQueryOptions(id)),
  retrieveKey: getMeshesRetrieveQueryKey,
  create: getMeshesCreateMutationOptions,
  update: getMeshesUpdateMutationOptions,
  destroy: getMeshesDestroyMutationOptions,
  devices: (meshId: string | null | undefined) =>
    whenId(meshId, ["meshes", "devices", "none"], (id) => getMeshesDevicesListQueryOptions(id)),
  devicesKey: getMeshesDevicesListQueryKey,
  links: getMeshesLinksListQueryOptions,
  traceroutes: getMeshesTraceroutesListQueryOptions,
  protocols: getProtocolsListQueryOptions,
};
