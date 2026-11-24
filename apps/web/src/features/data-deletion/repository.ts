import { getDataDeletionsListQueryKey, getDataDeletionsListQueryOptions } from "@mtt/contracts/api";

/** Scheduled deletions of stored readings. Superusers only. */
export const dataDeletionRepository = {
  list: getDataDeletionsListQueryOptions,
  listKey: getDataDeletionsListQueryKey,
};
