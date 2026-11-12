import {
  getMeshesCreateMutationOptions,
  getMeshesDevicesListQueryKey,
  getMeshesDevicesListQueryOptions,
  getMeshesRetrieveQueryOptions,
} from "@mtt/contracts/api";
import { readApiError } from "@mtt/contracts/errors";

export const meshRepository = {
  retrieve: getMeshesRetrieveQueryOptions,
  create: getMeshesCreateMutationOptions,
  devices: getMeshesDevicesListQueryOptions,
  devicesKey: getMeshesDevicesListQueryKey,
  /** A mesh that does not exist and a mesh that belongs to someone else look the same to the caller. */
  isMissing: (error: unknown) => [403, 404].includes(readApiError(error).status ?? 0),
};
