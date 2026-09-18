import { ownersCsrfCookieRetrieve } from "@mtt/contracts";
import {
  ownersLoginCreateMutation,
  ownersLogoutCreateMutation,
  ownersMeRetrieveOptions,
  ownersMeRetrieveQueryKey,
} from "@mtt/contracts/query";

export const authRepository = {
  csrf: ownersCsrfCookieRetrieve,
  login: ownersLoginCreateMutation,
  logout: ownersLogoutCreateMutation,
  me: ownersMeRetrieveOptions,
  meKey: ownersMeRetrieveQueryKey,
};
