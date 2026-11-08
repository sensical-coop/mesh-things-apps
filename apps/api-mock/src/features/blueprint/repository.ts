import { newId, nowIso } from "@mtt/domain/shared/ids";

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

export function blueprintDeviceCount(
  postprocessings: readonly { blueprintId: string; versionNumber: number }[],
  blueprintId: string,
  number: number,
): number {
  return postprocessings.filter((row) => row.blueprintId === blueprintId && row.versionNumber === number).length;
}

export function findBlueprint(blueprints: readonly BlueprintRow[], blueprintId: string): BlueprintRow | undefined {
  return blueprints.find((candidate) => candidate.id === blueprintId);
}

function nameTaken(blueprints: readonly BlueprintRow[], ownerId: string, name: string, exceptId?: string): boolean {
  return blueprints.some((row) => row.ownerId === ownerId && row.name === name && row.id !== exceptId);
}

function nameConflict(name: string): { detail: string } {
  return { detail: `You already have a blueprint named '${name}'` };
}

export function createBlueprint(
  blueprints: BlueprintRow[],
  ownerId: string,
  input: { name: string; description?: string | null; is_public?: boolean },
  version: BlueprintVersionRow,
): { row: BlueprintRow } | { conflict: { detail: string } } {
  if (nameTaken(blueprints, ownerId, input.name)) return { conflict: nameConflict(input.name) };
  const now = nowIso();
  const row: BlueprintRow = {
    id: newId(),
    name: input.name,
    description: input.description || null,
    isPublic: input.is_public ?? false,
    ownerId,
    versions: [version],
    createdAt: now,
    updatedAt: now,
  };
  blueprints.push(row);
  return { row };
}

export function updateBlueprint(
  blueprints: readonly BlueprintRow[],
  actorId: string,
  row: BlueprintRow,
  patch: { name?: string; description?: string | null; is_public?: boolean },
): { row: BlueprintRow } | { conflict: { detail: string } } {
  if (patch.name !== undefined && nameTaken(blueprints, actorId, patch.name, row.id)) {
    return { conflict: nameConflict(patch.name) };
  }
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.description !== undefined) row.description = patch.description || null;
  if (patch.is_public !== undefined) row.isPublic = patch.is_public;
  row.updatedAt = nowIso();
  return { row };
}

const BLUEPRINT_IN_USE = { detail: "Devices still use a version of this blueprint. Detach it from them first" };

export function deleteBlueprint(
  db: { blueprints: BlueprintRow[]; postprocessings: readonly { blueprintId: string }[] },
  row: BlueprintRow,
): { deleted: true } | { conflict: { detail: string } } {
  if (db.postprocessings.some((attached) => attached.blueprintId === row.id)) return { conflict: BLUEPRINT_IN_USE };
  db.blueprints = db.blueprints.filter((candidate) => candidate.id !== row.id);
  return { deleted: true };
}

export function addBlueprintVersion(row: BlueprintRow, version: BlueprintVersionRow): BlueprintVersionRow {
  row.versions.push(version);
  row.updatedAt = nowIso();
  return version;
}
