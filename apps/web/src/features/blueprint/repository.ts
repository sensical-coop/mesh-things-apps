import {
  getAlgorithmsListQueryOptions,
  getPostprocessingBlueprintsCreateMutationOptions,
  getPostprocessingBlueprintsDestroyMutationOptions,
  getPostprocessingBlueprintsListQueryKey,
  getPostprocessingBlueprintsListQueryOptions,
  getPostprocessingBlueprintsRetrieveQueryKey,
  getPostprocessingBlueprintsRetrieveQueryOptions,
  getPostprocessingBlueprintsUpdateMutationOptions,
  getPostprocessingBlueprintsVersionsCreateMutationOptions,
  getPostprocessingBlueprintsVersionsListQueryKey,
  getPostprocessingBlueprintsVersionsListQueryOptions,
  getPostprocessingBlueprintsVersionsRetrieveQueryOptions,
} from "@mtt/contracts/api";

export const blueprintRepository = {
  list: getPostprocessingBlueprintsListQueryOptions,
  listKey: getPostprocessingBlueprintsListQueryKey,
  retrieve: getPostprocessingBlueprintsRetrieveQueryOptions,
  retrieveKey: getPostprocessingBlueprintsRetrieveQueryKey,
  create: getPostprocessingBlueprintsCreateMutationOptions,
  update: getPostprocessingBlueprintsUpdateMutationOptions,
  destroy: getPostprocessingBlueprintsDestroyMutationOptions,
  versions: getPostprocessingBlueprintsVersionsListQueryOptions,
  versionsKey: getPostprocessingBlueprintsVersionsListQueryKey,
  version: getPostprocessingBlueprintsVersionsRetrieveQueryOptions,
  createVersion: getPostprocessingBlueprintsVersionsCreateMutationOptions,
  algorithms: getAlgorithmsListQueryOptions,
};
