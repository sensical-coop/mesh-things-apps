import { canManageSources, isVerifiedOwner, viewerOf, type ProfileFlags } from "@mtt/contracts/authz";

export function isOwnerSession(me: { isSuccess: boolean; data?: { is_active: boolean } }): boolean {
  return me.isSuccess && isVerifiedOwner(me.data);
}

/** Operator or superuser. Unknown while `me` is missing, so gated UI stays hidden. */
export function isOperator(me: ProfileFlags | undefined): boolean {
  return me != null && canManageSources(viewerOf(me));
}
