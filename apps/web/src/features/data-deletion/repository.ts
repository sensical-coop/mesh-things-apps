import { dataDeletionsListOptions, dataDeletionsListQueryKey } from "@mtt/contracts/query";

/** Scheduled deletions of stored readings. Superusers only. */
export const dataDeletionRepository = {
  list: dataDeletionsListOptions,
  listKey: dataDeletionsListQueryKey,
};
