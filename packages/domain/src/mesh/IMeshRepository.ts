import type { ListFilter } from "../shared/list-filter";
import type { Mesh, MeshCreate } from "./Mesh";

export interface IMeshRepository {
  list(filters?: ListFilter[]): Promise<Mesh[]>;
  get(id: string): Promise<Mesh | null>;
  insert(input: MeshCreate): Promise<Mesh>;
}
