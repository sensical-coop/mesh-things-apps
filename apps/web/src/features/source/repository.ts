import {
  getSourcesCreateMutationOptions,
  getSourcesDestroyMutationOptions,
  getSourcesListQueryKey,
  getSourcesListQueryOptions,
  getSourcesRestartCreateMutationOptions,
  getSourcesUpdateMutationOptions,
} from "@mtt/contracts/api";

export const sourceRepository = {
  list: getSourcesListQueryOptions,
  listKey: getSourcesListQueryKey,
  create: getSourcesCreateMutationOptions,
  update: getSourcesUpdateMutationOptions,
  destroy: getSourcesDestroyMutationOptions,
  restart: getSourcesRestartCreateMutationOptions,
};
