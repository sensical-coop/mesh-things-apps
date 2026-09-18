import {
  algorithmsListOptions,
  postprocessingBlueprintsCreateMutation,
  postprocessingBlueprintsListOptions,
  postprocessingBlueprintsListQueryKey,
} from "@mtt/contracts/query";

export const blueprintRepository = {
  list: postprocessingBlueprintsListOptions,
  listKey: postprocessingBlueprintsListQueryKey,
  create: postprocessingBlueprintsCreateMutation,
  algorithms: algorithmsListOptions,
};
