import type { OwnerProfile } from "@mtt/contracts";

export function isOwnerSession(me: { isSuccess: boolean; data?: { is_active: boolean } }): boolean {
  return me.isSuccess && me.data?.is_active === true;
}

/** Operator or superuser. Unknown while `me` is missing, so gated UI stays hidden. */
export function isOperator(me: Pick<OwnerProfile, "is_superuser" | "role"> | undefined): boolean {
  if (!me) return false;
  return me.is_superuser === true || me.role === "operator";
}
