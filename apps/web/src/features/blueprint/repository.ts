import type { QueryClient } from "@tanstack/react-query";
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

/** A blueprint changed: refresh the list, and the blueprint with its versions when `blueprintId` is given (not for a deleted one). */
export async function invalidateBlueprint(queryClient: QueryClient, blueprintId?: string): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: blueprintRepository.listKey() });
  if (!blueprintId) return;
  await queryClient.invalidateQueries({ queryKey: blueprintRepository.retrieveKey(blueprintId) });
  await queryClient.invalidateQueries({ queryKey: blueprintRepository.versionsKey(blueprintId) });
}
