/** `operator` is an owner who may also bridge remote brokers in as sources. */
export type Role = "owner" | "operator" | "staff" | "superuser";

export type Actor = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  alarmEmailCooldownSeconds: number | null;
  statusAlertsEnabled: boolean;
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
export function roleFlag(role: Role): "member" | "operator" {
  return role === "operator" ? "operator" : "member";
}

export function canReadMesh(actor: Actor, mesh: Viewable): boolean {
  if (!actor.isActive) return false;
  return (
    actor.role === "superuser" ||
    actor.role === "staff" ||
    mesh.ownerId === actor.id ||
    mesh.isPublic
  );
}

export function canSeePsk(actor: Actor, mesh: Owned): boolean {
  if (!actor.isActive) return false;
  return actor.role === "superuser" || mesh.ownerId === actor.id;
}

export function canWriteMesh(actor: Actor, mesh: Owned): boolean {
  if (!actor.isActive) return false;
  return actor.role === "superuser" || mesh.ownerId === actor.id;
}

export function canWriteCatalog(actor: Actor): boolean {
  return actor.isActive && (actor.role === "owner" || actor.role === "operator" || actor.role === "superuser");
}

export function canReadOwnerEmail(actor: Actor, subject: Actor): boolean {
  if (!actor.isActive) return false;
  return actor.role === "superuser" || actor.id === subject.id;
}

/** Meshes the actor may read: own or public — or every mesh for staff and superusers. */
export function visibleMeshes<T extends Viewable>(actor: Actor, rows: T[]): T[] {
  return rows.filter((row) => canReadMesh(actor, row));
}

export function visibleOwned<T extends Owned>(actor: Actor, rows: T[]): T[] {
  if (!actor.isActive) return [];
  if (actor.role === "superuser" || actor.role === "staff") return rows;
  return rows.filter((row) => row.ownerId === actor.id);
}

/** A blueprint as far as access is concerned: its owner (null once deleted while in use) and the public flag. */
export type Shareable = { ownerId: string | null; isPublic: boolean };

/** Own and public blueprints, or every one for staff and superusers. */
export function canReadBlueprint(actor: Actor, blueprint: Shareable): boolean {
  if (!actor.isActive) return false;
  return (
    actor.role === "superuser" ||
    actor.role === "staff" ||
    blueprint.ownerId === actor.id ||
    blueprint.isPublic
  );
}

export function visibleBlueprints<T extends Shareable>(actor: Actor, rows: T[]): T[] {
  return rows.filter((row) => canReadBlueprint(actor, row));
}

/** Its owner; a blueprint whose owner was deleted is left to superusers. */
export function canWriteBlueprint(actor: Actor, blueprint: Shareable): boolean {
  if (!actor.isActive) return false;
  return actor.role === "superuser" || (blueprint.ownerId !== null && blueprint.ownerId === actor.id);
}

/** A device may run its mesh owner's blueprints and public ones. */
export function canAttachBlueprint(actor: Actor, blueprint: Shareable, meshOwnerId: string): boolean {
  return actor.role === "superuser" || blueprint.isPublic || blueprint.ownerId === meshOwnerId;
}

/** A source as far as access is concerned: who created it. */
export type Created = { createdById: string | null };

/** Sources open connections from shared infrastructure: operators and superusers only. */
export function canManageSources(actor: Actor): boolean {
  return actor.isActive && (actor.role === "operator" || actor.role === "superuser");
}

/**
 * Devices are archived only on a mesh whose owner is an operator; a superuser counts as
 * one. Taking the role away stops archiving but keeps each device's setting.
 */
export function archivesFor(meshOwner: Pick<Actor, "role">): boolean {
  return meshOwner.role === "operator" || meshOwner.role === "superuser";
}

/** A device's archive setting, like its admin keys, is for the mesh's owner and superusers. */
export function canSeeArchiveSetting(actor: Actor, mesh: Owned): boolean {
  if (!actor.isActive) return false;
  return actor.role === "superuser" || mesh.ownerId === actor.id;
}

/** The archive itself: superusers, or the mesh's owner while an operator. */
export function canReadArchive(actor: Actor, mesh: Owned): boolean {
  if (!actor.isActive) return false;
  return actor.role === "superuser" || (actor.role === "operator" && mesh.ownerId === actor.id);
}

/** Every source for a superuser, their own for an operator, none for anyone else. */
export function visibleSources<T extends Created>(actor: Actor, rows: T[]): T[] {
  if (!canManageSources(actor)) return [];
  if (actor.role === "superuser") return rows;
  return rows.filter((row) => row.createdById === actor.id);
}

/** Sinks publish on shared infrastructure too, and are scoped like sources. */
export function canManageSinks(actor: Actor): boolean {
  return canManageSources(actor);
}

/** Every sink for a superuser, their own for an operator, none for anyone else. */
export function visibleSinks<T extends Created>(actor: Actor, rows: T[]): T[] {
  return visibleSources(actor, rows);
}

/** Only a plain owner asks for the operator role; operators and superusers already have it. */
export function canRequestOperator(actor: Actor): boolean {
  return actor.isActive && actor.role === "owner";
}

/** Superusers approve or reject operator requests. */
export function canDecideOperatorRequests(actor: Actor): boolean {
  return actor.isActive && actor.role === "superuser";
}

/** A mesh's `source_id`: its owner and superusers (read-only for them) see it. */
export function canSeeMeshSource(actor: Actor, mesh: Owned): boolean {
  return actor.isActive && (actor.role === "superuser" || mesh.ownerId === actor.id);
}

/** The schedule of stored-readings deletions: superusers only. */
export function canSeeDataDeletions(actor: Actor): boolean {
  return actor.isActive && actor.role === "superuser";
}
