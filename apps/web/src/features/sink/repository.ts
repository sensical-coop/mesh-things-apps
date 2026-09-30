import {
  sinksCreateMutation,
  sinksCredentialsCreateMutation,
  sinksDestroyMutation,
  sinksListOptions,
  sinksListQueryKey,
  sinksUpdateMutation,
} from "@mtt/contracts/query";

export const sinkRepository = {
  list: sinksListOptions,
  listKey: sinksListQueryKey,
  create: sinksCreateMutation,
  update: sinksUpdateMutation,
  rotateCredentials: sinksCredentialsCreateMutation,
  destroy: sinksDestroyMutation,
};
