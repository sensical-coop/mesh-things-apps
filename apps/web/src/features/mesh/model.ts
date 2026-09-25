import type { Mesh, OwnerProfile } from "@mtt/contracts";

export function meshTitle(mesh: Pick<Mesh, "channel_id" | "label">): string {
  return mesh.label?.trim() || mesh.channel_id;
}

/**
 * Mirrors the API's write rule: only the mesh's owner (or a superuser) may
 * change it. Public and shared meshes are read-only for everyone else. An
 * unknown caller can't edit, so write affordances stay hidden while `me` loads.
 */
export function canEditMesh(
  mesh: Pick<Mesh, "owner_id">,
  me: Pick<OwnerProfile, "id" | "is_superuser"> | undefined,
): boolean {
  if (!me) return false;
  return me.is_superuser === true || mesh.owner_id === me.id;
}
