/** A remote MQTT broker and topic filter, bridged into this instance. */
export type Source = {
  id: string;
  label: string | null;
  /** host:port */
  server: string;
  ssl: boolean;
  username: string | null;
  /** Accepted on writes, never returned. */
  password: string | null;
  topic: string;
  qos: number;
  createdById: string | null;
  /** The source terms accepted for it, when they lapse (null: never), and since when it is paused. */
  termsAcceptedVersion: string | null;
  termsExpiresAt: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SourceWrite = Pick<Source, "server" | "topic"> &
  Partial<Pick<Source, "label" | "ssl" | "username" | "password" | "qos">>;

/** Field name to message, the same keys the API answers 400 with. */
export type SourceErrors = Partial<Record<"server" | "topic" | "qos", string>>;

/** `host:port` with a port in 1–65535. */
export function isHostPort(value: string): boolean {
  const at = value.lastIndexOf(":");
  if (at <= 0) return false;
  const port = value.slice(at + 1);
  return /^\d+$/.test(port) && Number(port) > 0 && Number(port) < 65536;
}

/** A plain filter: `$share` and `$SYS` topics are refused. */
export function isPlainTopic(value: string): boolean {
  return value !== "" && !value.startsWith("$");
}

/**
 * The checks the API applies to a source write, minus the ones that need the
 * server's configuration (its own broker and the blocklists).
 */
export function validateSource(input: Partial<Pick<Source, "server" | "topic" | "qos">>): SourceErrors {
  const errors: SourceErrors = {};
  if (input.server !== undefined && !isHostPort(input.server.trim())) errors.server = "Must be host:port.";
  if (input.topic !== undefined && !isPlainTopic(input.topic.trim())) {
    errors.topic = "Must be a plain topic filter; $share and $SYS topics are not accepted.";
  }
  if (input.qos !== undefined && input.qos !== 0 && input.qos !== 1) errors.qos = "Must be 0 or 1.";
  return errors;
}
