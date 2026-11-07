import type { SinkCredentials, SinkRead } from "@mtt/contracts";
import { brokerHostPort } from "@mtt/contracts/source";
import { shellQuote } from "../../lib/shell-quote.ts";

export function sinkTitle(sink: Pick<SinkRead, "id" | "label">): string {
  return sink.label?.trim() || `Sink ${sink.id.slice(0, 8)}`;
}

/** Mirrors the API: a sink must send at least one stream. The dialog formats the code. */
export function sinkStreamsError(streams: readonly string[]): "empty" | undefined {
  return streams.length === 0 ? "empty" : undefined;
}

/** Each mesh with its devices, in the meshes' order; devices keep the order they came in. */
export function devicesByMesh<M extends { id: string }, D extends { mesh_id: string }>(
  meshes: readonly M[],
  devices: readonly D[],
): { mesh: M; devices: D[] }[] {
  return meshes.map((mesh) => ({ mesh, devices: devices.filter((device) => device.mesh_id === mesh.id) }));
}

/**
 * The single devices to send: a device whose whole mesh is ticked goes with the mesh and
 * needs no link of its own. Picks stay in the form, so unticking the mesh brings them back.
 */
export function singleDeviceIds(
  picked: Iterable<string>,
  wholeMeshIds: ReadonlySet<string>,
  meshOf: (deviceId: string) => string | undefined,
): string[] {
  return [...picked].filter((id) => {
    const meshId = meshOf(id);
    return meshId === undefined || !wholeMeshIds.has(meshId);
  });
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
