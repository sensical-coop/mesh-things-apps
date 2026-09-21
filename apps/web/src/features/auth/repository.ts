import { ownersCsrfCookieRetrieve } from "@mtt/contracts";
import {
  ownersCreateMutation,
  ownersListOptions,
  ownersListQueryKey,
  ownersLoginCreateMutation,
  ownersLogoutCreateMutation,
  ownersMeDestroyMutation,
  ownersMeResendVerificationCreateMutation,
  ownersMeRetrieveOptions,
  ownersMeRetrieveQueryKey,
  ownersMeUpdateMutation,
  ownersVerifyEmailRetrieveOptions,
} from "@mtt/contracts/query";

export const authRepository = {
  csrf: ownersCsrfCookieRetrieve,
  signup: ownersCreateMutation,
  login: ownersLoginCreateMutation,
  logout: ownersLogoutCreateMutation,
  me: ownersMeRetrieveOptions,
  meKey: ownersMeRetrieveQueryKey,
  update: ownersMeUpdateMutation,
  destroy: ownersMeDestroyMutation,
  list: ownersListOptions,
  listKey: ownersListQueryKey,
  resendVerification: ownersMeResendVerificationCreateMutation,
  verifyEmail: ownersVerifyEmailRetrieveOptions,
};
