import {
  readingsArchiveMeshesCredentialsCreateMutation,
  readingsArchiveMeshesRetrieveOptions,
  readingsArchiveMeshesRetrieveQueryKey,
} from "@mtt/contracts/query";

export const archiveRepository = {
  manifest: readingsArchiveMeshesRetrieveOptions,
  manifestKey: readingsArchiveMeshesRetrieveQueryKey,
  credentials: readingsArchiveMeshesCredentialsCreateMutation,
};
