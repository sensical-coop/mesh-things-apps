import {
  getSinksCreateMutationOptions,
  getSinksCredentialsCreateMutationOptions,
  getSinksDestroyMutationOptions,
  getSinksListQueryKey,
  getSinksListQueryOptions,
  getSinksUpdateMutationOptions,
} from "@mtt/contracts/api";
import { readApiError } from "@mtt/contracts/errors";

/** No broker API on this instance: every sink route answers 404. */
export function isSinksUnavailable(error: unknown): boolean {
  return readApiError(error).status === 404;
}

export const sinkRepository = {
  list: getSinksListQueryOptions,
  listKey: getSinksListQueryKey,
  create: getSinksCreateMutationOptions,
  update: getSinksUpdateMutationOptions,
  rotateCredentials: getSinksCredentialsCreateMutationOptions,
  destroy: getSinksDestroyMutationOptions,
};
