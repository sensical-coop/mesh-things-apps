export function isOwnerSession(me: { isSuccess: boolean; data?: { is_active: boolean } }): boolean {
  return me.isSuccess && me.data?.is_active === true;
}
