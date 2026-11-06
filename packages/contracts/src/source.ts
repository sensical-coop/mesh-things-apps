/** Field name to message, the same keys the API answers 400 with. */
export type SourceErrors = Partial<Record<"server" | "topic" | "qos", string>>;

/** `host` and `port` when `value` is `host:port` with a port in 1–65535. */
function splitHostPort(value: string): { host: string; port: string } | null {
  const at = value.lastIndexOf(":");
  if (at <= 0) return null;
  const port = value.slice(at + 1);
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) return null;
  return { host: value.slice(0, at), port };
}

export function isHostPort(value: string): boolean {
  return splitHostPort(value) !== null;
}

/** `host:port` for a client's flags. A bare host keeps MQTT over TLS's usual 8883. */
export function brokerHostPort(broker: string): { host: string; port: string } {
  return splitHostPort(broker) ?? { host: broker, port: "8883" };
}

/** A plain filter: `$share` and `$SYS` topics are refused. */
export function isPlainTopic(value: string): boolean {
  return value !== "" && !value.startsWith("$");
}

/**
 * The checks the API applies to a source write, minus the ones that need the
 * server's configuration (its own broker and the blocklists). Absent fields are skipped.
 * `server` and `topic` are trimmed, as the API does.
 */
export function validateSource(input: { server?: string; topic?: string; qos?: number }): SourceErrors {
  const errors: SourceErrors = {};
  if (input.server !== undefined && !isHostPort(input.server.trim())) errors.server = "Must be host:port.";
  if (input.topic !== undefined && !isPlainTopic(input.topic.trim())) {
    errors.topic = "Must be a plain topic filter; $share and $SYS topics are not accepted.";
  }
  if (input.qos !== undefined && input.qos !== 0 && input.qos !== 1) errors.qos = "Must be 0 or 1.";
  return errors;
}
