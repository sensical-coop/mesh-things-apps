import { devicesUpdate } from "@mtt/contracts";
import {
  readingsArchiveMeshesCredentialsCreateMutation,
  readingsArchiveMeshesRetrieveOptions,
  readingsArchiveMeshesRetrieveQueryKey,
} from "@mtt/contracts/query";

export const archiveRepository = {
  manifest: readingsArchiveMeshesRetrieveOptions,
  manifestKey: readingsArchiveMeshesRetrieveQueryKey,
  credentials: readingsArchiveMeshesCredentialsCreateMutation,
  /** One device's setting; a mesh-wide switch calls it per device, as the API has no bulk route. */
  setDeviceArchive: (deviceUuid: string, enabled: boolean) =>
    devicesUpdate({ path: { device_uuid: deviceUuid }, body: { archive_enabled: enabled }, throwOnError: true }),
};
