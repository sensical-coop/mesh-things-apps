import {
  getReadingsArchiveMeshesCredentialsCreateMutationOptions,
  getReadingsArchiveMeshesPartitionsRetrieveUrl,
  getReadingsArchiveMeshesRetrieveQueryKey,
  getReadingsArchiveMeshesRetrieveQueryOptions,
} from "@mtt/contracts/api";
import { readApiError } from "@mtt/contracts/errors";
import { API_URL } from "@mtt/contracts/runtime";
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
  /** Where one hour downloads from: a redirect to a temporary link, followed by the browser. */
  partitionUrl: (meshId: string, partition: { dt: string; hour: number }) =>
    `${API_URL.replace(/\/+$/, "")}${getReadingsArchiveMeshesPartitionsRetrieveUrl(meshId, partition.dt, partition.hour)}`,
};
