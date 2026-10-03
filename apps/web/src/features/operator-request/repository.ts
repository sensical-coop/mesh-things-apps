import {
  operatorRequestsListOptions,
  operatorRequestsListQueryKey,
  operatorRequestsRetrieveOptions,
  operatorRequestsRetrieveQueryKey,
  operatorRequestsUpdateMutation,
  ownersMeOperatorRequestCreateMutation,
  ownersMeOperatorRequestRetrieveQueryKey,
} from "@mtt/contracts/query";
import { ownersMeOperatorRequestRetrieve } from "@mtt/contracts";
import { queryOptions } from "@tanstack/react-query";
import { readApiError } from "@/lib/api-errors";

export const operatorRequestRepository = {
  /** The caller's latest request, or `null` when they never asked. */
  mine: myOperatorRequestQuery,
  mineKey: ownersMeOperatorRequestRetrieveQueryKey,
  create: ownersMeOperatorRequestCreateMutation,
  /** Superusers only. */
  list: operatorRequestsListOptions,
  listKey: operatorRequestsListQueryKey,
  retrieve: operatorRequestsRetrieveOptions,
  retrieveKey: operatorRequestsRetrieveQueryKey,
  decide: operatorRequestsUpdateMutation,
};

/**
 * The API answers 404 when the caller never asked. That's an answer rather than a
 * failure, so it's cached as `null` instead of being refetched on every visit.
 */
function myOperatorRequestQuery() {
  return queryOptions({
    queryKey: ownersMeOperatorRequestRetrieveQueryKey(),
    queryFn: async ({ signal }) => {
      try {
        const { data } = await ownersMeOperatorRequestRetrieve({ signal, throwOnError: true });
        return data;
      } catch (error) {
        if (readApiError(error).status === 404) return null;
        throw error;
      }
    },
  });
}
