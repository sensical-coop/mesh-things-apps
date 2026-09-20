import { Mesh, meshFilterValue } from "@mtt/domain/mesh/Mesh";
import type { MeshCreate } from "@mtt/domain/mesh/Mesh";
import type { IMeshRepository } from "@mtt/domain/mesh/IMeshRepository";
import { newId, nowIso } from "@mtt/domain/shared/ids";
import { matchesListFilters, type ListFilter } from "@mtt/domain/shared/list-filter";

export class MemoryMeshes implements IMeshRepository {
  readonly items = new Map<string, Mesh>();

  async list(filters?: ListFilter[]): Promise<Mesh[]> {
    const items = [...this.items.values()];
    if (!filters?.length) return items;
    return items.filter((mesh) => matchesListFilters((field) => meshFilterValue(mesh, field), filters));
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
      createdAt: now,
      updatedAt: now,
    });
    this.items.set(mesh.id, mesh);
    return mesh;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}
