import type { Mesh } from "@mtt/contracts";

export function meshTitle(mesh: Pick<Mesh, "channel_id" | "label">): string {
  return mesh.label?.trim() || mesh.channel_id;
}
