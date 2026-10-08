import { describe, expect, it } from "vitest";
import {
  archivesFor,
  canReadArchive,
  canSeeArchiveSetting,
  canReadMesh,
  canReadOwnerEmail,
  canSeePsk,
  canWriteCatalog,
  canDecideOperatorRequests,
  canManageSources,
  canSeeDataDeletions,
  canRequestOperator,
  canWriteMesh,
  flagsForRole,
  roleFlag,
  visibleMeshes,
  visibleOwned,
  visibleSources,
  type Actor,
} from "../../src/authz/authz";

const hill = { ownerId: "ada", isPublic: false };
const river = { ownerId: "bo", isPublic: false };
const lake = { ownerId: "bo", isPublic: true };

function actor(role: Actor["role"], id = "ada"): Actor {
  return {
    id,
    email: `${id}@sensical.test`,
    name: id,
    role,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastLogin: null,
    alarmEmailCooldownSeconds: null,
    statusAlertsEnabled: false,
    sourceRateAlertsEnabled: false,
  };
}

describe("authz", () => {
  it("keeps an owner on their own mesh, including the PSK", () => {
    const ada = actor("owner");
    expect(canReadMesh(ada, hill)).toBe(true);
    expect(canSeePsk(ada, hill)).toBe(true);
    expect(canWriteMesh(ada, hill)).toBe(true);
    expect(canReadMesh(ada, river)).toBe(false);
    expect(canSeePsk(ada, river)).toBe(false);
  });

  it("lets staff read every mesh without the PSK or writes", () => {
    const staff = actor("staff", "pat");
    expect(canReadMesh(staff, hill)).toBe(true);
    expect(canSeePsk(staff, hill)).toBe(false);
    expect(canWriteMesh(staff, hill)).toBe(false);
    expect(canWriteCatalog(staff)).toBe(false);
  });

  it("gives superuser every flag and every owner's email", () => {
    const admin = actor("superuser", "admin");
    const ada = actor("owner");
    expect(flagsForRole("superuser")).toEqual({ isSuperuser: true, isStaff: true });
    expect(canSeePsk(admin, river)).toBe(true);
    expect(canWriteMesh(admin, river)).toBe(true);
    expect(canWriteCatalog(admin)).toBe(true);
    expect(canReadOwnerEmail(admin, ada)).toBe(true);
    expect(canReadOwnerEmail(ada, admin)).toBe(false);
  });

  it("filters owned rows for a plain owner", () => {
    const ada = actor("owner");
    expect(visibleOwned(ada, [hill, river])).toEqual([hill]);
  });

  it("lets an owner read public meshes, without the PSK or writes", () => {
    const ada = actor("owner");
    expect(canReadMesh(ada, lake)).toBe(true);
    expect(canSeePsk(ada, lake)).toBe(false);
    expect(canWriteMesh(ada, lake)).toBe(false);
    expect(visibleMeshes(ada, [hill, river, lake])).toEqual([hill, lake]);
  });

  it("hides every mesh from an inactive owner, public or not", () => {
    const ada = { ...actor("owner"), isActive: false };
    expect(visibleMeshes(ada, [hill, lake])).toEqual([]);
  });

  it("lets an operator manage only their own sources, and own meshes like any owner", () => {
    const op = actor("operator", "op");
    const mine = { createdById: "op" };
    const theirs = { createdById: "other" };
    expect(canManageSources(op)).toBe(true);
    expect(visibleSources(op, [mine, theirs])).toEqual([mine]);
    expect(canWriteCatalog(op)).toBe(true);
    expect(canReadMesh(op, hill)).toBe(false);
    expect(canWriteMesh(op, { ownerId: "op" })).toBe(true);
    expect(flagsForRole("operator")).toEqual({ isSuperuser: false, isStaff: false });
    expect(roleFlag("operator")).toBe("operator");
  });

  it("gives superusers every source and nobody else any", () => {
    const rows = [{ createdById: "op" }, { createdById: null }];
    expect(visibleSources(actor("superuser", "admin"), rows)).toEqual(rows);
    expect(visibleSources(actor("owner"), rows)).toEqual([]);
    expect(visibleSources(actor("staff", "pat"), rows)).toEqual([]);
    expect(canManageSources({ ...actor("operator", "op"), isActive: false })).toBe(false);
    expect(roleFlag("superuser")).toBe("member");
  });

  it("lets only a plain owner request the operator role, and only a superuser decide", () => {
    expect(canRequestOperator(actor("owner"))).toBe(true);
    expect(canRequestOperator(actor("operator", "op"))).toBe(false);
    expect(canRequestOperator(actor("staff", "pat"))).toBe(false);
    expect(canRequestOperator(actor("superuser", "admin"))).toBe(false);
    expect(canDecideOperatorRequests(actor("superuser", "admin"))).toBe(true);
    expect(canDecideOperatorRequests(actor("staff", "pat"))).toBe(false);
  });

  it("shows the deletion schedule to superusers only", () => {
    expect(canSeeDataDeletions(actor("superuser", "admin"))).toBe(true);
    expect(canSeeDataDeletions(actor("staff", "pat"))).toBe(false);
    expect(canSeeDataDeletions(actor("operator", "op"))).toBe(false);
  });

  it("archives only on an operator's meshes, read by that operator or a superuser", () => {
    const opMesh = { ownerId: "op" };
    expect(archivesFor(actor("operator", "op"))).toBe(true);
    expect(archivesFor(actor("superuser", "admin"))).toBe(true);
    expect(archivesFor(actor("owner"))).toBe(false);
    expect(archivesFor(actor("staff", "pat"))).toBe(false);
    expect(canReadArchive(actor("operator", "op"), opMesh)).toBe(true);
    expect(canReadArchive(actor("operator", "other"), opMesh)).toBe(false);
    expect(canReadArchive(actor("superuser", "admin"), opMesh)).toBe(true);
    expect(canReadArchive(actor("staff", "pat"), opMesh)).toBe(false);
    // A plain owner sees their setting, which applies again if they become an operator.
    expect(canReadArchive(actor("owner"), hill)).toBe(false);
    expect(canSeeArchiveSetting(actor("owner"), hill)).toBe(true);
    expect(canSeeArchiveSetting(actor("owner", "bo"), hill)).toBe(false);
    expect(canSeeArchiveSetting(actor("staff", "pat"), hill)).toBe(false);
    expect(canReadArchive({ ...actor("operator", "op"), isActive: false }, opMesh)).toBe(false);
  });
});
