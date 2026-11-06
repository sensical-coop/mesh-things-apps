import type { Mesh, MeshCreate } from "./Mesh";

export type MeshPatch = {
  channelId?: string;
  pskB64?: string;
  label?: string | null;
  isPublic?: boolean;
  sourceId?: string | null;
  discoverGateways?: boolean;
};

export interface IMeshRepository {
  list(): Promise<Mesh[]>;
  get(id: string): Promise<Mesh | null>;
  insert(input: MeshCreate): Promise<Mesh>;
  update(id: string, patch: MeshPatch): Promise<Mesh | null>;
  delete(id: string): Promise<boolean>;
}
