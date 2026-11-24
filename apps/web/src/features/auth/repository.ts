import {
  getOwnersListQueryKey,
  getOwnersListQueryOptions,
  getOwnersMeDestroyMutationOptions,
  getOwnersMeRotateKeyCreateMutationOptions,
  getOwnersMeRetrieveQueryOptions,
  getOwnersMeUpdateMutationOptions,
  getOwnersRequestPasswordResetCreateMutationOptions,
  getOwnersResetPasswordCreateMutationOptions,
  getOwnersVerifyEmailRetrieveQueryOptions,
  ownersVerifyEmailRetrieve,
} from "@mtt/contracts/api";

export const authRepository = {
  me: getOwnersMeRetrieveQueryOptions,
  update: getOwnersMeUpdateMutationOptions,
  destroy: getOwnersMeDestroyMutationOptions,
  list: getOwnersListQueryOptions,
  listKey: getOwnersListQueryKey,
  rotateKey: getOwnersMeRotateKeyCreateMutationOptions,
  // The token is single-use. The query function never reads `signal`: if it did, a remount would cancel the
  // first request after the server spent the token, and the refetch would get a 400.
  verifyEmail: (params: Parameters<typeof getOwnersVerifyEmailRetrieveQueryOptions>[0]) => ({
    ...getOwnersVerifyEmailRetrieveQueryOptions(params),
    queryFn: () => ownersVerifyEmailRetrieve(params),
  }),
  requestPasswordReset: getOwnersRequestPasswordResetCreateMutationOptions,
  resetPassword: getOwnersResetPasswordCreateMutationOptions,
};
