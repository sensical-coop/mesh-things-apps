/** Field name to message, the same keys the API answers 400 with. */
export type SourceErrors = Partial<Record<"server" | "topic" | "qos", string>>;

/** MQTT over TLS's usual port, when a broker address gives no port. */
export const MQTT_TLS_PORT = 8883;

/**
 * `host` and `port` when `value` is `host:port` with a port in 1–65535.
 * A bare IPv6 (`::1`) has more than one colon and no brackets, so it is not a port split.
 */
function splitHostPort(value: string): { host: string; port: string } | null {
  const colons = value.split(":").length - 1;
  if (colons > 1 && !value.startsWith("[")) return null;
  const at = value.lastIndexOf(":");
  if (at <= 0) return null;
  const port = value.slice(at + 1);
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) return null;
  return { host: value.slice(0, at), port };
}

export function isHostPort(value: string): boolean {
  return splitHostPort(value) !== null;
}

/** `host:port` for a client's flags. A bare host keeps MQTT over TLS's usual port. */
export function brokerHostPort(broker: string): { host: string; port: string } {
  return splitHostPort(broker) ?? { host: broker, port: String(MQTT_TLS_PORT) };
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
