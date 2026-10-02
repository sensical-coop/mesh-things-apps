export type BlueprintInputRow = { slot: string; default_channel?: string | null };

/** `inputs` maps an algorithm input to `slot:<slot>` or `step:<key>.<output>`; `outputs` an algorithm output to a derived field. */
export type BlueprintStepRow = {
  key: string;
  order: number;
  function_name: string;
  inputs: Record<string, string>;
  params: Record<string, unknown>;
  outputs: Record<string, string>;
};

/** Immutable once created: changing steps means adding a version. */
export type BlueprintVersionRow = {
  number: number;
  inputs: BlueprintInputRow[];
  steps: BlueprintStepRow[];
  notes: string | null;
  createdAt: string;
};

export type BlueprintRow = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  /** Null once its owner was deleted while devices still used it. */
  ownerId: string | null;
  versions: BlueprintVersionRow[];
  createdAt: string;
  updatedAt: string;
};

export function latestVersion(blueprint: BlueprintRow): BlueprintVersionRow {
  const latest = blueprint.versions.at(-1);
  if (!latest) throw new Error(`Blueprint ${blueprint.id} has no version`);
  return latest;
}

export function versionNumbered(blueprint: BlueprintRow, number: number): BlueprintVersionRow | undefined {
  return blueprint.versions.find((version) => version.number === number);
}
