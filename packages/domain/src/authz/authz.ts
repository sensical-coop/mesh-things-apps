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

/** A source as far as access is concerned: who created it. */
export type Created = { createdById: string | null };

/** Sources open connections from shared infrastructure: operators and superusers only. */
export function canManageSources(actor: Actor): boolean {
  return actor.isActive && (actor.role === "operator" || actor.role === "superuser");
}

/** Every source for a superuser, their own for an operator, none for anyone else. */
export function visibleSources<T extends Created>(actor: Actor, rows: T[]): T[] {
  if (!canManageSources(actor)) return [];
  if (actor.role === "superuser") return rows;
  return rows.filter((row) => row.createdById === actor.id);
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
