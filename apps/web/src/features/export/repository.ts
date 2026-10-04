import {
  readingsExportsListOptions,
  readingsExportsListQueryKey,
  readingsMeshesExportsCreateMutation,
  readingsMeshesExportsListOptions,
  readingsMeshesExportsListQueryKey,
  readingsMeshesExportsRetrieveOptions,
} from "@mtt/contracts/query";

export const exportRepository = {
  list: readingsExportsListOptions,
  listKey: readingsExportsListQueryKey,
  meshList: readingsMeshesExportsListOptions,
  meshListKey: readingsMeshesExportsListQueryKey,
  retrieve: readingsMeshesExportsRetrieveOptions,
  create: readingsMeshesExportsCreateMutation,
};
