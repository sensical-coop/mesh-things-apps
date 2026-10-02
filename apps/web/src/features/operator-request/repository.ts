import {
  operatorRequestsListOptions,
  operatorRequestsListQueryKey,
  operatorRequestsRetrieveOptions,
  operatorRequestsRetrieveQueryKey,
  operatorRequestsUpdateMutation,
  ownersMeOperatorRequestCreateMutation,
  ownersMeOperatorRequestRetrieveOptions,
  ownersMeOperatorRequestRetrieveQueryKey,
} from "@mtt/contracts/query";

export const operatorRequestRepository = {
  /** The caller's latest request; 404 when they never asked. */
  mine: ownersMeOperatorRequestRetrieveOptions,
  mineKey: ownersMeOperatorRequestRetrieveQueryKey,
  create: ownersMeOperatorRequestCreateMutation,
  /** Superusers only. */
  list: operatorRequestsListOptions,
  listKey: operatorRequestsListQueryKey,
  retrieve: operatorRequestsRetrieveOptions,
  retrieveKey: operatorRequestsRetrieveQueryKey,
  decide: operatorRequestsUpdateMutation,
};
