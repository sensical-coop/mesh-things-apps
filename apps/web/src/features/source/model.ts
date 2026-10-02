import type { OwnerProfile, SourceRead } from "@mtt/contracts";

/**
 * Mirrors the API: operators manage their own sources, superusers every one.
 * An unknown caller can't, so the tab stays hidden while `me` loads.
 */
export function canManageSources(me: Pick<OwnerProfile, "is_superuser" | "role"> | undefined): boolean {
  if (!me) return false;
  return me.is_superuser === true || me.role === "operator";
}

export function sourceTitle(source: Pick<SourceRead, "label" | "server" | "topic">): string {
  return source.label?.trim() || `${source.server} ${source.topic}`;
}

export type SourceFieldErrors = Partial<Record<"server" | "topic" | "qos", string>>;

/**
 * The API's own checks that need no server configuration. The server still
 * refuses its own broker and blocked brokers or topics; those come back as 400s.
 */
export function validateSourceFields(input: { server: string; topic: string; qos: number }): SourceFieldErrors {
  const errors: SourceFieldErrors = {};
  const at = input.server.lastIndexOf(":");
  const port = input.server.slice(at + 1);
  if (at <= 0 || !/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    errors.server = "Must be host:port.";
  }
  if (input.topic === "" || input.topic.startsWith("$")) {
    errors.topic = "Must be a plain topic filter; $share and $SYS topics are not accepted.";
  }
  if (input.qos !== 0 && input.qos !== 1) errors.qos = "Must be 0 or 1.";
  return errors;
}
