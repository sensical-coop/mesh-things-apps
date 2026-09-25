import { describe, expect, it } from "vitest";
import {
  canReadMesh,
  canReadOwnerEmail,
  canSeePsk,
  canWriteCatalog,
  canWriteMesh,
  flagsForRole,
  visibleMeshes,
  visibleOwned,
  type Actor,
} from "../../src/authz/authz";

const hill = { ownerId: "ada", isPublic: false, viewerIds: new Set<string>() };
const river = { ownerId: "bo", isPublic: false, viewerIds: new Set<string>() };
const lake = { ownerId: "bo", isPublic: true, viewerIds: new Set<string>() };
const delta = { ownerId: "bo", isPublic: false, viewerIds: new Set(["ada"]) };

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

  it("lets an owner read public and granted meshes, without the PSK or writes", () => {
    const ada = actor("owner");
    for (const mesh of [lake, delta]) {
      expect(canReadMesh(ada, mesh)).toBe(true);
      expect(canSeePsk(ada, mesh)).toBe(false);
      expect(canWriteMesh(ada, mesh)).toBe(false);
    }
    expect(visibleMeshes(ada, [hill, river, lake, delta])).toEqual([hill, lake, delta]);
  });

  it("hides every mesh from an inactive owner, public or not", () => {
    const ada = { ...actor("owner"), isActive: false };
    expect(visibleMeshes(ada, [hill, lake, delta])).toEqual([]);
  });
});
