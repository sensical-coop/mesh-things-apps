import {
  algorithmsListOptions,
  postprocessingBlueprintsCreateMutation,
  postprocessingBlueprintsDestroyMutation,
  postprocessingBlueprintsListOptions,
  postprocessingBlueprintsListQueryKey,
  postprocessingBlueprintsRetrieveOptions,
  postprocessingBlueprintsRetrieveQueryKey,
  postprocessingBlueprintsUpdateMutation,
  postprocessingBlueprintsVersionsCreateMutation,
  postprocessingBlueprintsVersionsListOptions,
  postprocessingBlueprintsVersionsListQueryKey,
  postprocessingBlueprintsVersionsRetrieveOptions,
} from "@mtt/contracts/query";

export const blueprintRepository = {
  list: postprocessingBlueprintsListOptions,
  listKey: postprocessingBlueprintsListQueryKey,
  retrieve: postprocessingBlueprintsRetrieveOptions,
  retrieveKey: postprocessingBlueprintsRetrieveQueryKey,
  create: postprocessingBlueprintsCreateMutation,
  update: postprocessingBlueprintsUpdateMutation,
  destroy: postprocessingBlueprintsDestroyMutation,
  versions: postprocessingBlueprintsVersionsListOptions,
  versionsKey: postprocessingBlueprintsVersionsListQueryKey,
  version: postprocessingBlueprintsVersionsRetrieveOptions,
  createVersion: postprocessingBlueprintsVersionsCreateMutation,
  algorithms: algorithmsListOptions,
};
