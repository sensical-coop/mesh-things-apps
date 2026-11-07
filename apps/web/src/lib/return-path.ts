/** Same-origin paths a verification or sign-in link may send the owner back to. Subset of the API allow-list. */
export const RETURN_PATHS: readonly string[] = ["/start"];

/** Exact allow-listed path, or undefined. Rejects scheme, protocol-relative, traversal, and query suffixes. */
export function safeReturnPath(value: unknown): string | undefined {
  return typeof value === "string" && RETURN_PATHS.includes(value) ? value : undefined;
}
