import {
  getReadingsExportsListQueryKey,
  getReadingsExportsListQueryOptions,
  getReadingsMeshesExportsCreateMutationOptions,
  getReadingsMeshesExportsListQueryKey,
  getReadingsMeshesExportsListQueryOptions,
  getReadingsMeshesExportsRetrieveQueryOptions,
} from "@mtt/contracts/api";

export const exportRepository = {
  list: getReadingsExportsListQueryOptions,
  listKey: getReadingsExportsListQueryKey,
  meshList: getReadingsMeshesExportsListQueryOptions,
  meshListKey: getReadingsMeshesExportsListQueryKey,
  retrieve: getReadingsMeshesExportsRetrieveQueryOptions,
  create: getReadingsMeshesExportsCreateMutationOptions,
};
