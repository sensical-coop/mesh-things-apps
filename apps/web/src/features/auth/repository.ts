import { ownersCsrfCookieRetrieve } from "@mtt/contracts";
import {
  ownersCreateMutation,
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
  resendVerification: ownersMeResendVerificationCreateMutation,
  verifyEmail: ownersVerifyEmailRetrieveOptions,
};
