import { Mesh, meshFilterValue } from "@mtt/domain/mesh/Mesh";
import type { MeshCreate } from "@mtt/domain/mesh/Mesh";
import type { IMeshRepository } from "@mtt/domain/mesh/IMeshRepository";
import type { Viewable } from "@mtt/domain/authz/authz";
import { newId, nowIso } from "@mtt/domain/shared/ids";
import { matchesListFilters, type ListFilter } from "@mtt/domain/shared/list-filter";

export type MeshViewerGrant = { id: string; meshId: string; viewerId: string; createdAt: string };

export class MemoryMeshes implements IMeshRepository {
  readonly items = new Map<string, Mesh>();
  // meshId -> viewerId -> grant
  readonly grants = new Map<string, Map<string, MeshViewerGrant>>();

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
      isPublic: input.isPublic ?? false,
      sourceId: input.sourceId ?? null,
      createdAt: now,
      updatedAt: now,
    });
    this.items.set(mesh.id, mesh);
    return mesh;
  }

  async update(
    id: string,
    patch: { channelId?: string; pskB64?: string; label?: string | null; isPublic?: boolean; sourceId?: string | null },
  ): Promise<Mesh | null> {
    const mesh = this.items.get(id);
    if (!mesh) return null;
    if (patch.channelId !== undefined) mesh.channelId = patch.channelId;
    if (patch.pskB64 !== undefined) mesh.pskB64 = patch.pskB64;
    if (patch.label !== undefined) mesh.label = patch.label;
    if (patch.isPublic !== undefined) mesh.isPublic = patch.isPublic;
    if (patch.sourceId !== undefined) mesh.sourceId = patch.sourceId;
    mesh.updatedAt = nowIso();
    return mesh;
  }

  async delete(id: string): Promise<boolean> {
    this.grants.delete(id);
    return this.items.delete(id);
  }

  /** The mesh plus its grants, in the shape authz reads. */
  viewable(mesh: Mesh): Viewable {
    return {
      ownerId: mesh.ownerId,
      isPublic: mesh.isPublic,
      viewerIds: new Set(this.grants.get(mesh.id)?.keys() ?? []),
    };
  }

  listViewers(meshId: string): MeshViewerGrant[] {
    return [...(this.grants.get(meshId)?.values() ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /** Idempotent: returns the existing grant with `created: false` on a repeat. */
  grant(meshId: string, viewerId: string): { grant: MeshViewerGrant; created: boolean } {
    const byViewer = this.grants.get(meshId) ?? new Map<string, MeshViewerGrant>();
    this.grants.set(meshId, byViewer);
    const existing = byViewer.get(viewerId);
    if (existing) return { grant: existing, created: false };
    const grant = { id: newId(), meshId, viewerId, createdAt: nowIso() };
    byViewer.set(viewerId, grant);
    return { grant, created: true };
  }

  revoke(meshId: string, viewerId: string): boolean {
    return this.grants.get(meshId)?.delete(viewerId) ?? false;
  }

  /** Drops every grant held by a deleted owner. */
  revokeViewerEverywhere(viewerId: string): void {
    for (const byViewer of this.grants.values()) byViewer.delete(viewerId);
  }
}
