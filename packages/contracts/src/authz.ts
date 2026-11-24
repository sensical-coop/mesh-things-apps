import type { RoleEnum } from "./generated/model.zod";

/** `operator` is an owner who may also bridge remote brokers in as sources. */
export type Role = "owner" | "operator" | "staff" | "superuser";

/** Who is asking. The mock's owner record and the console's profile both satisfy this. */
export type Viewer = { id: string; role: Role; isActive: boolean };

/** Email confirmed. The profile flag is `is_active`. */
export function isVerifiedOwner(owner: { is_active: boolean } | undefined): boolean {
  return owner?.is_active === true;
}

/** The console's `OwnerProfile`, as far as a role is concerned. */
export type ProfileFlags = {
  id: string;
  role: RoleEnum;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
};

export type Owned = { ownerId: string };

/** A mesh as far as read access is concerned: its owner and the public flag. */
export type Viewable = Owned & { isPublic: boolean };

export function flagsForRole(role: Role): { isSuperuser: boolean; isStaff: boolean } {
  return {
    isSuperuser: role === "superuser",
    isStaff: role === "staff" || role === "superuser",
  };
}

/** The HTTP `role` field, Django-shaped: only member or operator. */
export function roleFlag(role: Role): RoleEnum {
  return role === "operator" ? "operator" : "member";
}

/** Inverse of `flagsForRole` and `roleFlag`: the console profile as a viewer. */
export function viewerOf(me: ProfileFlags): Viewer {
  const role: Role = me.is_superuser ? "superuser" : me.is_staff ? "staff" : me.role === "operator" ? "operator" : "owner";
  return { id: me.id, role, isActive: me.is_active };
}

function activeOwner(actor: Viewer, ownerId: string): boolean {
  return actor.isActive && (actor.role === "superuser" || ownerId === actor.id);
}

/** Meshes and blueprints: own or public, or every one for staff and superusers. */
export function canReadShared(actor: Viewer, row: { ownerId: string | null; isPublic: boolean }): boolean {
  return actor.isActive && (actor.role === "superuser" || actor.role === "staff" || row.ownerId === actor.id || row.isPublic);
}

export function canSeePsk(actor: Viewer, mesh: Owned): boolean {
  return activeOwner(actor, mesh.ownerId);
}

export function canWriteMesh(actor: Viewer, mesh: Owned): boolean {
  return activeOwner(actor, mesh.ownerId);
}

export function canWriteCatalog(actor: Viewer): boolean {
  return actor.isActive && (actor.role === "owner" || actor.role === "operator" || actor.role === "superuser");
}

export function canReadOwnerEmail(actor: Viewer, subject: { id: string }): boolean {
  if (!actor.isActive) return false;
  return actor.role === "superuser" || actor.id === subject.id;
}

/** Meshes the actor may read: own or public — or every mesh for staff and superusers. */
export function visibleMeshes<T extends Viewable>(actor: Viewer, rows: T[]): T[] {
  return rows.filter((row) => canReadShared(actor, row));
}

/** A blueprint as far as access is concerned: its owner (null once deleted while in use) and the public flag. */
export type Shareable = { ownerId: string | null; isPublic: boolean };

export function visibleBlueprints<T extends Shareable>(actor: Viewer, rows: T[]): T[] {
  return rows.filter((row) => canReadShared(actor, row));
}

/** Its owner; a blueprint whose owner was deleted is left to superusers. */
export function canWriteBlueprint(actor: Viewer, blueprint: Pick<Shareable, "ownerId">): boolean {
  if (!actor.isActive) return false;
  return actor.role === "superuser" || (blueprint.ownerId !== null && blueprint.ownerId === actor.id);
}

/** A device may run its mesh owner's blueprints and public ones. An inactive viewer may not. */
export function canAttachBlueprint(actor: Viewer, blueprint: Shareable, meshOwnerId: string): boolean {
  return actor.isActive && (actor.role === "superuser" || blueprint.isPublic || blueprint.ownerId === meshOwnerId);
}

/** A source or sink as far as access is concerned: who created it. */
export type Created = { createdById: string | null };

function operatorTier(role: Role): boolean {
  return role === "operator" || role === "superuser";
}

/** Sources, sinks and the archive run on shared infrastructure: operators and superusers only. */
export function canOperate(actor: Viewer): boolean {
  return actor.isActive && operatorTier(actor.role);
}

/**
 * Devices are archived only on a mesh whose owner is an operator; a superuser counts as
 * one. Taking the role away stops archiving but keeps each device's setting.
 */
export function archivesFor(meshOwner: Pick<Viewer, "role">): boolean {
  return operatorTier(meshOwner.role);
}

/** A device's archive setting, like its admin keys, is for the mesh's owner and superusers. */
export function canSeeArchiveSetting(actor: Viewer, mesh: Owned): boolean {
  return activeOwner(actor, mesh.ownerId);
}

/** The archive itself: superusers, or the mesh's owner while an operator. */
export function canReadArchive(actor: Viewer, mesh: Owned): boolean {
  if (!actor.isActive) return false;
  return actor.role === "superuser" || (actor.role === "operator" && mesh.ownerId === actor.id);
}

/** Every source or sink for a superuser, their own for an operator, none for anyone else. */
export function visibleOperated<T extends Created>(actor: Viewer, rows: T[]): T[] {
  if (!canOperate(actor)) return [];
  if (actor.role === "superuser") return rows;
  return rows.filter((row) => row.createdById === actor.id);
}

/** Only a plain owner asks for the operator role; operators and superusers already have it. */
export function canRequestOperator(actor: Viewer): boolean {
  return actor.isActive && actor.role === "owner";
}

/** Superusers approve or reject operator requests. */
export function canDecideOperatorRequests(actor: Viewer): boolean {
  return actor.isActive && actor.role === "superuser";
}

/** A mesh's `source_id`: its owner and superusers (read-only for them) see it. */
export function canSeeMeshSource(actor: Viewer, mesh: Owned): boolean {
  return activeOwner(actor, mesh.ownerId);
}

/** The schedule of stored-readings deletions: superusers only. */
export function canSeeDataDeletions(actor: Viewer): boolean {
  return actor.isActive && actor.role === "superuser";
}
