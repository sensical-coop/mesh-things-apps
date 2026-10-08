/** A remote MQTT broker and topic root, bridged into this instance one channel at a time. */
export type Source = {
  id: string;
  label: string | null;
  /** host:port */
  server: string;
  ssl: boolean;
  username: string | null;
  /** Accepted on writes, never returned. */
  password: string | null;
  /** Literal prefix before `/2/e`, such as `msh/EU_868`. */
  root: string;
  qos: number;
  createdById: string | null;
  /** The source terms accepted for it, when they lapse (null: never), and since when it is paused. */
  termsAcceptedVersion: string | null;
  termsExpiresAt: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SourceWrite = Pick<Source, "server" | "root"> &
  Partial<Pick<Source, "label" | "ssl" | "username" | "password" | "qos">>;

/** Field name to message, the same keys the API answers 400 with. */
export type SourceErrors = Partial<Record<"server" | "root" | "qos", string>>;

/** `host:port` with a port in 1–65535. */
export function isHostPort(value: string): boolean {
  const at = value.lastIndexOf(":");
  if (at <= 0) return false;
  const port = value.slice(at + 1);
  return /^\d+$/.test(port) && Number(port) > 0 && Number(port) < 65536;
}

/** A root as the API stores it: trimmed, without trailing slashes. */
export function normalizeRoot(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/**
 * Why a root is refused, with the API's message, or undefined when it is valid.
 * Every subscription names one channel beneath it, so it must be literal and stop
 * before `/2/e`.
 */
export function rootError(value: string): string | undefined {
  const root = normalizeRoot(value);
  const levels = root.split("/");
  if (root.startsWith("$") || /[+#]/.test(root) || levels.includes("")) {
    return "Must be a literal topic prefix, without wildcards or empty levels.";
  }
  if (levels.length < 2) return "Must have at least two levels, such as msh/EU_868.";
  if (levels.includes("2")) return "Give only the part before /2/e, such as msh/EU_868.";
  return undefined;
}

/**
 * The checks the API applies to a source write, minus the ones that need the
 * server's configuration (its own broker and the blocklists).
 */
export function validateSource(input: Partial<Pick<Source, "server" | "root" | "qos">>): SourceErrors {
  const errors: SourceErrors = {};
  if (input.server !== undefined && !isHostPort(input.server.trim())) errors.server = "Must be host:port.";
  const root = input.root === undefined ? undefined : rootError(input.root);
  if (root) errors.root = root;
  if (input.qos !== undefined && input.qos !== 0 && input.qos !== 1) errors.qos = "Must be 0 or 1.";
  return errors;
}
