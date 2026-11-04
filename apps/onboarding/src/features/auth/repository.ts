import {
  getOwnersCreateMutationOptions,
  getOwnersLoginCreateMutationOptions,
  getOwnersLogoutCreateMutationOptions,
  getOwnersMeResendVerificationCreateMutationOptions,
  getOwnersMeRetrieveQueryKey,
  getOwnersMeRetrieveQueryOptions,
  ownersCsrfCookieRetrieve,
} from "@mtt/contracts/api";

export const authRepository = {
  csrf: ownersCsrfCookieRetrieve,
  signup: getOwnersCreateMutationOptions,
  login: getOwnersLoginCreateMutationOptions,
  logout: getOwnersLogoutCreateMutationOptions,
  me: getOwnersMeRetrieveQueryOptions,
  meKey: getOwnersMeRetrieveQueryKey,
  resendVerification: getOwnersMeResendVerificationCreateMutationOptions,
};
