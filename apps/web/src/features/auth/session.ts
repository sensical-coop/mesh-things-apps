export function isOwnerSession(me: { isSuccess: boolean }): boolean {
  return me.isSuccess;
}
