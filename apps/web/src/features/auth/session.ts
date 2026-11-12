import { isVerifiedOwner } from "@mtt/contracts/authz";

/** Return paths are other apps on this origin (`SITE_PATHS.start`), so the router cannot take them. */
export function goToReturnPath(path: string): void {
  window.location.assign(path);
}

export function isOwnerSession(me: { isSuccess: boolean; data?: { is_active: boolean } }): boolean {
  return me.isSuccess && isVerifiedOwner(me.data);
}
