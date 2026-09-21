const STORAGE_KEY = "mtt_pending_owner_key";

/**
 * A freshly-signed-up owner has no session cookie yet (the account starts
 * inactive/unverified and the backend refuses to log it in until the email
 * is verified). The signup response's one-time `api_key` is the only
 * credential available in that window, so it's held here and sent as a
 * Bearer token until a real session takes over.
 */
export function setPendingOwnerKey(key: string): void {
  sessionStorage.setItem(STORAGE_KEY, key);
}

export function getPendingOwnerKey(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function clearPendingOwnerKey(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
