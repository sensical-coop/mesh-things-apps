import {
  devicesUpdate,
  getReadingsArchiveMeshesCredentialsCreateMutationOptions,
  getReadingsArchiveMeshesRetrieveQueryKey,
  getReadingsArchiveMeshesRetrieveQueryOptions,
} from "@mtt/contracts/api";

export const archiveRepository = {
  manifest: getReadingsArchiveMeshesRetrieveQueryOptions,
  manifestKey: getReadingsArchiveMeshesRetrieveQueryKey,
  credentials: getReadingsArchiveMeshesCredentialsCreateMutationOptions,
  /** One device's setting; a mesh-wide switch calls it per device, as the API has no bulk route. */
  setDeviceArchive: (deviceUuid: string, enabled: boolean) =>
    devicesUpdate(deviceUuid, { archive_enabled: enabled }),
};
