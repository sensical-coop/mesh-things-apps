import { OperatorRequestStatusEnum } from "@mtt/contracts";
import { canRequestOperator as mayRequestOperator, viewerOf, type ProfileFlags } from "@mtt/contracts/authz";

/** Only a plain owner asks; operators, superusers and staff don't. Hidden while `me` loads. */
export function canRequestOperator(me: ProfileFlags | undefined): boolean {
  return me != null && mayRequestOperator(viewerOf(me));
}

export const OPERATOR_REQUEST_STATUSES = OperatorRequestStatusEnum.options;

export type OperatorRequestStatusFilter = OperatorRequestStatusEnum | "all";
