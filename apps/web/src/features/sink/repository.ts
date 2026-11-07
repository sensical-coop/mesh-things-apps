import {
  getSinksCreateMutationOptions,
  getSinksCredentialsCreateMutationOptions,
  getSinksDestroyMutationOptions,
  getSinksListQueryKey,
  getSinksListQueryOptions,
  getSinksUpdateMutationOptions,
} from "@mtt/contracts/api";

export const sinkRepository = {
  list: getSinksListQueryOptions,
  listKey: getSinksListQueryKey,
  create: getSinksCreateMutationOptions,
  update: getSinksUpdateMutationOptions,
  rotateCredentials: getSinksCredentialsCreateMutationOptions,
  destroy: getSinksDestroyMutationOptions,
};
