import { readApiError } from "@mtt/contracts/errors";
import {
  getOwnersCreateMutationOptions,
  getOwnersLoginCreateMutationOptions,
  getOwnersLogoutCreateMutationOptions,
  getOwnersMeGatewayBrokerRetrieveQueryKey,
  getOwnersMeResendVerificationCreateMutationOptions,
  getOwnersMeRetrieveQueryKey,
  getOwnersMeRetrieveQueryOptions,
  ownersCsrfCookieRetrieve,
  ownersMeGatewayBrokerRetrieve,
} from "@mtt/contracts/api";

export const authRepository = {
  csrf: ownersCsrfCookieRetrieve,
  signup: getOwnersCreateMutationOptions,
  login: getOwnersLoginCreateMutationOptions,
  logout: getOwnersLogoutCreateMutationOptions,
  me: getOwnersMeRetrieveQueryOptions,
  meKey: getOwnersMeRetrieveQueryKey,
  resendVerification: getOwnersMeResendVerificationCreateMutationOptions,
  /** 404 is "not configured" (`null`), not a failure. Values stay in the query cache only. */
  broker: () => ({
    queryKey: getOwnersMeGatewayBrokerRetrieveQueryKey(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      try {
        return await ownersMeGatewayBrokerRetrieve({ signal });
      } catch (error) {
        if (readApiError(error).status === 404) return null;
        throw error;
      }
    },
  }),
};
