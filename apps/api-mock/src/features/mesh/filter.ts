import type { Mesh } from "@mtt/domain/mesh/Mesh";
import { listFilterFields } from "../../list-filter";

export const meshFilters = listFilterFields<[Mesh]>([
  { wire: "label", read: (mesh) => mesh.label ?? "" },
  { wire: "channel_id", read: (mesh) => mesh.channelId },
]);
