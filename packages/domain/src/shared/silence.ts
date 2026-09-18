/** True when last_seen is older than `missed` publish intervals. Never-seen is silent. */
export function isSilent(
  lastSeen: string | null,
  publishIntervalSeconds: number | null,
  nowMs = Date.now(),
  missed = 3,
): boolean {
  if (!lastSeen) return true;
  const intervalMs = (publishIntervalSeconds && publishIntervalSeconds > 0 ? publishIntervalSeconds : 300) * 1000;
  const seen = Date.parse(lastSeen);
  if (!Number.isFinite(seen)) return true;
  return seen + missed * intervalMs < nowMs;
}
