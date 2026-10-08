import type { OwnerProfile, SourceRead } from "@mtt/contracts";

/**
 * Mirrors the API: operators manage their own sources, superusers every one.
 * An unknown caller can't, so the tab stays hidden while `me` loads.
 */
export function canManageSources(me: Pick<OwnerProfile, "is_superuser" | "role"> | undefined): boolean {
  if (!me) return false;
  return me.is_superuser === true || me.role === "operator";
}

export function sourceTitle(source: Pick<SourceRead, "label" | "server" | "root">): string {
  return source.label?.trim() || `${source.server} ${source.root}`;
}

export type SourceFieldErrors = Partial<Record<"server" | "root" | "qos", string>>;

/** A root as the API stores it: trimmed, without trailing slashes. */
export function normalizeRoot(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/**
 * The API's own checks that need no server configuration. The server still
 * refuses its own broker and blocked brokers or roots; those come back as 400s.
 */
export function validateSourceFields(input: { server: string; root: string; qos: number }): SourceFieldErrors {
  const errors: SourceFieldErrors = {};
  const at = input.server.lastIndexOf(":");
  const port = input.server.slice(at + 1);
  if (at <= 0 || !/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    errors.server = "Must be host:port.";
  }
  const root = normalizeRoot(input.root);
  const levels = root.split("/");
  if (root.startsWith("$") || /[+#]/.test(root) || levels.includes("")) {
    errors.root = "Must be a literal topic prefix, without wildcards or empty levels.";
  } else if (levels.length < 2) {
    errors.root = "Must have at least two levels, such as msh/EU_868.";
  } else if (levels.includes("2")) {
    errors.root = "Give only the part before /2/e, such as msh/EU_868.";
  }
  if (input.qos !== 0 && input.qos !== 1) errors.qos = "Must be 0 or 1.";
  return errors;
}
