import { Mesh } from "@mtt/domain/mesh/Mesh";
import type { MeshCreate } from "@mtt/domain/mesh/Mesh";
import type { IMeshRepository, MeshPatch } from "@mtt/domain/mesh/IMeshRepository";
import { newId, nowIso } from "@mtt/domain/shared/ids";

export class MemoryMeshes implements IMeshRepository {
  readonly items = new Map<string, Mesh>();

  async list(): Promise<Mesh[]> {
    return [...this.items.values()];
  }

  async get(id: string): Promise<Mesh | null> {
    return this.items.get(id) ?? null;
  }

  async insert(input: MeshCreate): Promise<Mesh> {
    const now = nowIso();
    const mesh = new Mesh({
      id: newId(),
      channelId: input.channelId,
      pskB64: input.pskB64,
      label: input.label ?? null,
      ownerId: input.ownerId,
      isPublic: input.isPublic ?? false,
      sourceId: input.sourceId ?? null,
      discoverGateways: input.discoverGateways ?? false,
      createdAt: now,
      updatedAt: now,
    });
    this.items.set(mesh.id, mesh);
    return mesh;
  }

  async update(id: string, patch: MeshPatch): Promise<Mesh | null> {
    const mesh = this.items.get(id);
    if (!mesh) return null;
    if (patch.channelId !== undefined) mesh.channelId = patch.channelId;
    if (patch.pskB64 !== undefined) mesh.pskB64 = patch.pskB64;
    if (patch.label !== undefined) mesh.label = patch.label;
    if (patch.isPublic !== undefined) mesh.isPublic = patch.isPublic;
    if (patch.sourceId !== undefined) mesh.sourceId = patch.sourceId;
    if (patch.discoverGateways !== undefined) mesh.discoverGateways = patch.discoverGateways;
    mesh.updatedAt = nowIso();
    return mesh;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}
