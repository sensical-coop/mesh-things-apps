import {
  sourcesCreateMutation,
  sourcesDestroyMutation,
  sourcesListOptions,
  sourcesListQueryKey,
  sourcesUpdateMutation,
} from "@mtt/contracts/query";

export const sourceRepository = {
  list: sourcesListOptions,
  listKey: sourcesListQueryKey,
  create: sourcesCreateMutation,
  update: sourcesUpdateMutation,
  destroy: sourcesDestroyMutation,
};
