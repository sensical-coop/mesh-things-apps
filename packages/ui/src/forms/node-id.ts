export type NodeIdFormat = "decimal" | "hex";

const MAX_NODE_ID = 0xffffffff;
const HEX_PREFIX_PATTERN = /^\s*(!|0x)/i;
/** Meshtastic's prefix for a hex node id. */
export const HEX_PREFIX = "!";

// Meshtastic shows node ids as "!7efeee00"; the API wants the decimal number.
// Hex accepts the "!" (or "0x") prefix or none. Null when empty or invalid.
export function parseNodeId(raw: string, format: NodeIdFormat): number | null {
  const digits = format === "hex" ? stripHexPrefix(raw) : raw.trim();
  const pattern = format === "hex" ? /^[0-9a-f]{1,8}$/i : /^\d{1,10}$/;
  if (!pattern.test(digits)) return null;
  const value = format === "hex" ? Number.parseInt(digits, 16) : Number(digits);
  return value <= MAX_NODE_ID ? value : null;
}

/** The typed text without Meshtastic's "!" or a "0x" prefix. */
export function stripHexPrefix(raw: string): string {
  return raw.replace(HEX_PREFIX_PATTERN, "").trim();
}

/** Whether typed text can only be hex: Meshtastic's "!", a "0x" prefix, or a hex letter. */
export function looksHex(raw: string): boolean {
  return HEX_PREFIX_PATTERN.test(raw) || /[a-f]/i.test(raw);
}

export function formatNodeId(value: number, format: NodeIdFormat): string {
  return format === "hex" ? `${HEX_PREFIX}${value.toString(16).padStart(8, "0")}` : String(value);
}
