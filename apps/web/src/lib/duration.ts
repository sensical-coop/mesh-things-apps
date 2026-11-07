const UNIT_MS = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
const WINDOW_PATTERN = /^(\d+)(s|m|h|d)$/;

export function parseWindowMs(window: string): number | null {
  const match = WINDOW_PATTERN.exec(window);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(amount) || (unit !== "s" && unit !== "m" && unit !== "h" && unit !== "d")) return null;
  return amount * UNIT_MS[unit];
}

export function spanMs(window: string): number {
  const ms = parseWindowMs(window);
  if (ms == null) throw new Error(`Unknown span ${window}`);
  return ms;
}
