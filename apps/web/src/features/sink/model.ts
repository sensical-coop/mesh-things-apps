import type { SinkCredentials, SinkRead, StreamsEnum } from "@mtt/contracts";

/** What a sink can send, in the order the API stores it. */
export const SINK_STREAMS: readonly StreamsEnum[] = ["decoded", "derived", "alarms"];

export function sinkTitle(sink: Pick<SinkRead, "id" | "label">): string {
  return sink.label?.trim() || `Sink ${sink.id.slice(0, 8)}`;
}

/** Streams as the API stores them: known ones only, in canonical order, without repeats. */
export function orderStreams(streams: Iterable<string>): StreamsEnum[] {
  const wanted = new Set(streams);
  return SINK_STREAMS.filter((stream) => wanted.has(stream));
}

/** Mirrors the API: a sink must send at least one stream. */
export function sinkStreamsError(streams: readonly string[]): string | undefined {
  return streams.length === 0 ? "Choose at least one stream." : undefined;
}

/**
 * The devices still worth offering one by one: those whose mesh isn't already sent whole.
 * A device picked before its mesh was ticked stays picked, so the API gets what was chosen.
 */
export function singleDeviceChoices<T extends { uuid: string; mesh_id: string }>(
  devices: readonly T[],
  wholeMeshIds: ReadonlySet<string>,
  pickedDeviceIds: ReadonlySet<string>,
): T[] {
  return devices.filter((device) => !wholeMeshIds.has(device.mesh_id) || pickedDeviceIds.has(device.uuid));
}

/** `host:port` split for a client's flags; a bare host keeps MQTT over TLS's usual 8883. */
export function brokerHostPort(broker: string): { host: string; port: string } {
  const at = broker.lastIndexOf(":");
  if (at <= 0 || !/^\d+$/.test(broker.slice(at + 1))) return { host: broker, port: "8883" };
  return { host: broker.slice(0, at), port: broker.slice(at + 1) };
}

/** Single quotes for a POSIX shell, so a password with `$` or `!` survives pasting. */
function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

/**
 * A mosquitto_sub command that consumes everything the sink sends, over TLS, with the
 * credentials just issued. `-c` with a client id keeps a persistent session, so the broker
 * queues messages while the consumer is offline.
 */
export function consumerCommand(credentials: Pick<SinkCredentials, "broker" | "username" | "password" | "topic_filter">): string {
  const { host, port } = brokerHostPort(credentials.broker);
  return [
    `mosquitto_sub -h ${host} -p ${port} --capath /etc/ssl/certs \\`,
    `  -u ${shellQuote(credentials.username)} -P ${shellQuote(credentials.password)} \\`,
    `  -i ${shellQuote(credentials.username)} -c -q 1 \\`,
    `  -t ${shellQuote(credentials.topic_filter)} -v`,
  ].join("\n");
}
