import {
  getOperatorRequestsListQueryKey,
  getOperatorRequestsListQueryOptions,
  getOperatorRequestsRetrieveQueryKey,
  getOperatorRequestsRetrieveQueryOptions,
  getOperatorRequestsUpdateMutationOptions,
  getOwnersMeOperatorRequestCreateMutationOptions,
  getOwnersMeOperatorRequestRetrieveQueryKey,
  ownersMeOperatorRequestRetrieve,
} from "@mtt/contracts/api";
import { queryOptions } from "@tanstack/react-query";
import { nullOn404 } from "@mtt/contracts/errors";

export const operatorRequestRepository = {
  /** The caller's latest request, or `null` when they never asked. */
  mine: myOperatorRequestQuery,
  mineKey: getOwnersMeOperatorRequestRetrieveQueryKey,
  create: getOwnersMeOperatorRequestCreateMutationOptions,
  /** Superusers only. */
  list: getOperatorRequestsListQueryOptions,
  listKey: getOperatorRequestsListQueryKey,
  retrieve: getOperatorRequestsRetrieveQueryOptions,
  retrieveKey: getOperatorRequestsRetrieveQueryKey,
  decide: getOperatorRequestsUpdateMutationOptions,
};

/**
 * The API answers 404 when the caller never asked. That's an answer rather than a
 * failure, so it's cached as `null` instead of being refetched on every visit.
 */
function myOperatorRequestQuery() {
  return queryOptions({
    queryKey: getOwnersMeOperatorRequestRetrieveQueryKey(),
    queryFn: ({ signal }) => nullOn404(() => ownersMeOperatorRequestRetrieve({ signal })),
  });
}
