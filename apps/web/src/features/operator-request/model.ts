import {
  canDecideOperatorRequests as mayDecideOperatorRequests,
  canRequestOperator as mayRequestOperator,
  viewerOf,
  type ProfileFlags,
} from "@mtt/contracts/authz";

/** Only a plain owner asks; operators, superusers and staff don't. Hidden while `me` loads. */
export function canRequestOperator(me: ProfileFlags | undefined): boolean {
  return me != null && mayRequestOperator(viewerOf(me));
}

/** Superusers approve or reject requests. Hidden while `me` loads. */
export function canDecideOperatorRequests(me: ProfileFlags | undefined): boolean {
  return me != null && mayDecideOperatorRequests(viewerOf(me));
}

export const OPERATOR_REQUEST_STATUSES = ["pending", "approved", "rejected", "all"] as const;

export type OperatorRequestStatusFilter = (typeof OPERATOR_REQUEST_STATUSES)[number];
