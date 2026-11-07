export type NodeIdFormat = "decimal" | "hex";

const MAX_NODE_ID = 0xffffffff;

// Meshtastic shows node ids as "!7efeee00"; the API wants the decimal number.
// Hex accepts the "!" (or "0x") prefix or none. Null when empty or invalid.
export function parseNodeId(raw: string, format: NodeIdFormat): number | null {
  const text = raw.trim();
  const digits = format === "hex" ? text.replace(/^(!|0x)/i, "") : text;
  const pattern = format === "hex" ? /^[0-9a-f]{1,8}$/i : /^\d{1,10}$/;
  if (!pattern.test(digits)) return null;
  const value = format === "hex" ? Number.parseInt(digits, 16) : Number(digits);
  return value <= MAX_NODE_ID ? value : null;
}

export function formatNodeId(value: number, format: NodeIdFormat): string {
  return format === "hex" ? `!${value.toString(16).padStart(8, "0")}` : String(value);
}
