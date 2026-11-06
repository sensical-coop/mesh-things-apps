import {
  devicesUpdate,
  getReadingsArchiveMeshesCredentialsCreateMutationOptions,
  getReadingsArchiveMeshesRetrieveQueryKey,
  getReadingsArchiveMeshesRetrieveQueryOptions,
} from "@mtt/contracts/api";
import { readApiError } from "@mtt/contracts/errors";
import { whenId } from "@/lib/query-when-id";

/** A 404 on one's own mesh means the instance runs no archive; asking again won't help. */
export function isArchiveUnavailable(error: unknown): boolean {
  return readApiError(error).status === 404;
}

export const archiveRepository = {
  manifest: (meshId: string | null | undefined) =>
    whenId(meshId, ["archive", "manifest", "none"], getReadingsArchiveMeshesRetrieveQueryOptions),
  manifestKey: getReadingsArchiveMeshesRetrieveQueryKey,
  credentials: getReadingsArchiveMeshesCredentialsCreateMutationOptions,
  /** One device's setting; a mesh-wide switch calls it per device, as the API has no bulk route. */
  setDeviceArchive: (deviceUuid: string, enabled: boolean) =>
    devicesUpdate(deviceUuid, { archive_enabled: enabled }),
};
