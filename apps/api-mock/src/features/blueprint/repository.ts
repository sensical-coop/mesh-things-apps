export type BlueprintRow = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  steps: { id: string; order: number; function_name: string; inputs: unknown; params: unknown; outputs: unknown }[];
  createdAt: string;
  updatedAt: string;
};
