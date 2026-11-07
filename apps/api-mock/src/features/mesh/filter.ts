import type { Mesh } from "@mtt/domain/mesh/Mesh";

const MESH_WIRE_FIELDS: { wire: string; read: (mesh: Mesh) => string }[] = [
  { wire: "label", read: (mesh) => mesh.label ?? "" },
  { wire: "channel_id", read: (mesh) => mesh.channelId },
];

export const meshListFilterFields = MESH_WIRE_FIELDS.map((row) => row.wire);

export function meshFilterValue(mesh: Mesh, field: string): string | undefined {
  const found = MESH_WIRE_FIELDS.find((row) => row.wire === field);
  if (!found) return undefined;
  return found.read(mesh);
}
