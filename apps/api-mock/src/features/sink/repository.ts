import { archivesFor, canWriteMesh, visibleOperated } from "@mtt/contracts/authz";
import { MQTT_TLS_PORT } from "@mtt/contracts/source";
import type { Sink, SinkPatch } from "@mtt/domain/sink/Sink";
import { newId, nowIso } from "@mtt/domain/shared/ids";
import type { Actor } from "../../auth";
import type { Store } from "../../store";

/** Mirrors REGISTRY__EMQX_API_URL set: off, as on an instance without EMQX, every sink route answers 404. */
export const SINKS_ENABLED = process.env.MOCK_SINKS !== "false";

/** Mirrors MQTT_SINKS__BROKER: where consumers connect over TLS. */
export const SINKS_BROKER = process.env.MOCK_SINKS_BROKER ?? `mqtt.localhost:${MQTT_TLS_PORT}`;

/** Mirrors MQTT_CONNECTORS__NAMESPACE, which prefixes the sink's user and topics. */
const NAMESPACE = "mt-sources";

export function sinkUsername(sinkId: string): string {
  return `${NAMESPACE}-sink-${sinkId}`;
}

export function sinkTopicFilter(sinkId: string): string {
  return `${NAMESPACE}-sinks/${sinkId}/#`;
}

/** A consumer password as the API makes one: random, shown once. */
export function newSinkPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Buffer.from(bytes).toString("base64url");
}

export class MemorySinks {
  readonly items = new Map<string, Sink>();
  /** Consumers connected now, as EMQX would report them. */
  readonly connections = new Map<string, number>();

  async list(): Promise<Sink[]> {
    return [...this.items.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async get(id: string): Promise<Sink | null> {
    return this.items.get(id) ?? null;
  }

  async insert(input: SinkPatch & { streams: string[]; createdById: string }): Promise<Sink> {
    const now = nowIso();
    const sink: Sink = {
      id: newId(),
      label: input.label ?? null,
      streams: input.streams,
      meshIds: input.meshIds ?? [],
      deviceIds: input.deviceIds ?? [],
      password: newSinkPassword(),
      createdById: input.createdById,
      termsAcceptedVersion: null,
      termsExpiresAt: null,
      pausedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(sink.id, sink);
    return sink;
  }

  async update(id: string, patch: SinkPatch): Promise<Sink | null> {
    const sink = this.items.get(id);
    if (!sink) return null;
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) Object.assign(sink, { [key]: value });
    }
    sink.updatedAt = nowIso();
    return sink;
  }

  /** New password, and the connected consumers are dropped. */
  async rotate(id: string): Promise<Sink | null> {
    const sink = this.items.get(id);
    if (!sink) return null;
    sink.password = newSinkPassword();
    sink.updatedAt = nowIso();
    this.connections.set(id, 0);
    return sink;
  }

  async delete(id: string): Promise<boolean> {
    this.connections.delete(id);
    return this.items.delete(id);
  }
}

export async function sinkForOperator(db: Store, actor: Actor, sinkId: string): Promise<Sink | null> {
  const sink = await db.sinks.get(sinkId);
  return sink && visibleOperated(actor, [sink]).length > 0 ? sink : null;
}

export function streamsError(streams: readonly string[] | undefined): Record<string, string[]> {
  return streams && streams.length === 0 ? { streams: ["This list may not be empty."] } : {};
}

/**
 * As SinkWriteSerializer: every mesh, and every device's mesh, must be one the caller may
 * edit and owned by an operator (a superuser counts).
 */
export async function sinkTargetErrors(
  db: Store,
  actor: Actor,
  input: { mesh_ids?: string[]; device_ids?: string[] },
): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};
  const check = async (label: string, meshId: string | null) => {
    const mesh = meshId ? await db.meshes.get(meshId) : null;
    if (!mesh || !canWriteMesh(actor, mesh)) return `${label} not found.`;
    const owner = db.actors.get(mesh.ownerId);
    if (!owner || !archivesFor(owner)) return `${label} is on a mesh not owned by an operator.`;
    return null;
  };
  for (const meshId of input.mesh_ids ?? []) {
    const error = await check(`Mesh ${meshId}`, meshId);
    if (error) (errors.mesh_ids ??= []).push(error);
  }
  for (const deviceId of input.device_ids ?? []) {
    const device = await db.devices.get(deviceId);
    const error = await check(`Device ${deviceId}`, device?.meshId ?? null);
    if (error) (errors.device_ids ??= []).push(error);
  }
  return errors;
}
