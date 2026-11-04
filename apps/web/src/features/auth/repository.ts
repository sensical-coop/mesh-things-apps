import {
  getOwnersCreateMutationOptions,
  getOwnersListQueryKey,
  getOwnersListQueryOptions,
  getOwnersLoginCreateMutationOptions,
  getOwnersLogoutCreateMutationOptions,
  getOwnersMeDestroyMutationOptions,
  getOwnersMeResendVerificationCreateMutationOptions,
  getOwnersMeRotateKeyCreateMutationOptions,
  getOwnersMeRetrieveQueryKey,
  getOwnersMeRetrieveQueryOptions,
  getOwnersMeUpdateMutationOptions,
  getOwnersRequestPasswordResetCreateMutationOptions,
  getOwnersResetPasswordCreateMutationOptions,
  getOwnersVerifyEmailRetrieveQueryOptions,
  ownersCsrfCookieRetrieve,
  ownersVerifyEmailRetrieve,
} from "@mtt/contracts/api";

export const authRepository = {
  csrf: ownersCsrfCookieRetrieve,
  signup: getOwnersCreateMutationOptions,
  login: getOwnersLoginCreateMutationOptions,
  logout: getOwnersLogoutCreateMutationOptions,
  me: getOwnersMeRetrieveQueryOptions,
  meKey: getOwnersMeRetrieveQueryKey,
  update: getOwnersMeUpdateMutationOptions,
  destroy: getOwnersMeDestroyMutationOptions,
  list: getOwnersListQueryOptions,
  listKey: getOwnersListQueryKey,
  resendVerification: getOwnersMeResendVerificationCreateMutationOptions,
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
