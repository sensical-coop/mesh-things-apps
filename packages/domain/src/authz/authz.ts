export type Role = "owner" | "staff" | "superuser";

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
  return actor.isActive && (actor.role === "owner" || actor.role === "superuser");
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
