import type { OwnerProfile } from "@mtt/contracts";

/** Mirrors the API: only a plain member asks; operators, superusers and staff don't. */
export function canRequestOperator(
  me: Pick<OwnerProfile, "is_superuser" | "is_staff" | "role"> | undefined,
): boolean {
  if (!me) return false;
  return !me.is_superuser && !me.is_staff && me.role === "member";
}

/** Superusers approve or reject requests. */
export function canDecideOperatorRequests(me: Pick<OwnerProfile, "is_superuser"> | undefined): boolean {
  return me?.is_superuser === true;
}

export const OPERATOR_REQUEST_STATUSES = ["pending", "approved", "rejected", "all"] as const;

export type OperatorRequestStatusFilter = (typeof OPERATOR_REQUEST_STATUSES)[number];
