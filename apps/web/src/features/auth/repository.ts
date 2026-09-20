import { ownersCsrfCookieRetrieve } from "@mtt/contracts";
import {
  ownersCreateMutation,
  ownersListOptions,
  ownersListQueryKey,
  ownersLoginCreateMutation,
  ownersLogoutCreateMutation,
  ownersMeResendVerificationCreateMutation,
  ownersMeRetrieveOptions,
  ownersMeRetrieveQueryKey,
  ownersVerifyEmailRetrieveOptions,
} from "@mtt/contracts/query";

export const authRepository = {
  csrf: ownersCsrfCookieRetrieve,
  signup: ownersCreateMutation,
  login: ownersLoginCreateMutation,
  logout: ownersLogoutCreateMutation,
  me: ownersMeRetrieveOptions,
  meKey: ownersMeRetrieveQueryKey,
  list: ownersListOptions,
  listKey: ownersListQueryKey,
  resendVerification: ownersMeResendVerificationCreateMutation,
  verifyEmail: ownersVerifyEmailRetrieveOptions,
};
