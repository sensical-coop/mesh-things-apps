import { describe, expect, it } from "vitest";
import {
  archivesFor,
  canAttachBlueprint,
  canDecideOperatorRequests,
  canManageSinks,
  canManageSources,
  canReadArchive,
  canReadBlueprint,
  canReadMesh,
  canReadOwnerEmail,
  canRequestOperator,
  canSeeArchiveSetting,
  canSeeDataDeletions,
  canSeePsk,
  canWriteBlueprint,
  canWriteCatalog,
  canWriteMesh,
  flagsForRole,
  roleFlag,
  isVerifiedOwner,
  viewerOf,
  visibleBlueprints,
  visibleMeshes,
  visibleSinks,
  visibleSources,
  type Role,
  type Viewer,
} from "../src/authz";

const hill = { ownerId: "ada", isPublic: false };
const river = { ownerId: "bo", isPublic: false };
const lake = { ownerId: "bo", isPublic: true };

function actor(role: Role, id = "ada", isActive = true): Viewer {
  return { id, role, isActive };
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

  it("lets an owner read public meshes, without the PSK or writes", () => {
    const ada = actor("owner");
    expect(canReadMesh(ada, lake)).toBe(true);
    expect(canSeePsk(ada, lake)).toBe(false);
    expect(canWriteMesh(ada, lake)).toBe(false);
    expect(visibleMeshes(ada, [hill, river, lake])).toEqual([hill, lake]);
  });

  it("hides every mesh from an inactive owner, public or not", () => {
    const ada = actor("owner", "ada", false);
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
  });

  it("gives superusers every source and nobody else any", () => {
    const rows = [{ createdById: "op" }, { createdById: null }];
    expect(visibleSources(actor("superuser", "admin"), rows)).toEqual(rows);
    expect(visibleSources(actor("owner"), rows)).toEqual([]);
    expect(visibleSources(actor("staff", "pat"), rows)).toEqual([]);
    expect(canManageSources(actor("operator", "op", false))).toBe(false);
    expect(roleFlag("superuser")).toBe("member");
  });

  it("lets only a plain owner request the operator role, and only a superuser decide", () => {
    expect(canRequestOperator(actor("owner"))).toBe(true);
    expect(canRequestOperator(actor("operator", "op"))).toBe(false);
    expect(canRequestOperator(actor("staff", "pat"))).toBe(false);
    expect(canRequestOperator(actor("superuser", "admin"))).toBe(false);
    expect(canRequestOperator(actor("owner", "ada", false))).toBe(false);
    expect(canDecideOperatorRequests(actor("superuser", "admin"))).toBe(true);
    expect(canDecideOperatorRequests(actor("staff", "pat"))).toBe(false);
    expect(canDecideOperatorRequests(actor("superuser", "admin", false))).toBe(false);
  });

  it("shows the deletion schedule to superusers only", () => {
    expect(canSeeDataDeletions(actor("superuser", "admin"))).toBe(true);
    expect(canSeeDataDeletions(actor("staff", "pat"))).toBe(false);
    expect(canSeeDataDeletions(actor("operator", "op"))).toBe(false);
    expect(canSeeDataDeletions(actor("superuser", "admin", false))).toBe(false);
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
    expect(canReadArchive(actor("operator", "op", false), opMesh)).toBe(false);
  });

  it("reads own and public blueprints, and writes only one's own", () => {
    const ada = actor("owner");
    const mine = { ownerId: "ada", isPublic: false };
    const theirs = { ownerId: "bo", isPublic: false };
    const shared = { ownerId: "bo", isPublic: true };
    const orphan = { ownerId: null, isPublic: false };
    expect(canReadBlueprint(ada, mine)).toBe(true);
    expect(canReadBlueprint(ada, shared)).toBe(true);
    expect(canReadBlueprint(ada, theirs)).toBe(false);
    expect(canWriteBlueprint(ada, mine)).toBe(true);
    expect(canWriteBlueprint(ada, shared)).toBe(false);
    expect(canWriteBlueprint(ada, orphan)).toBe(false);
    expect(canWriteBlueprint(actor("superuser", "admin"), orphan)).toBe(true);
    expect(canWriteBlueprint(actor("owner", "ada", false), mine)).toBe(false);
    expect(visibleBlueprints(ada, [mine, theirs, shared])).toEqual([mine, shared]);
    expect(visibleBlueprints(actor("staff", "pat"), [mine, theirs])).toEqual([mine, theirs]);
    expect(visibleBlueprints(actor("owner", "ada", false), [mine, shared])).toEqual([]);
  });

  it("attaches a mesh owner's blueprints and public ones, and nothing while inactive", () => {
    const ada = actor("owner");
    const mine = { ownerId: "ada", isPublic: false };
    const shared = { ownerId: "bo", isPublic: true };
    const theirs = { ownerId: "bo", isPublic: false };
    expect(canAttachBlueprint(ada, mine, "ada")).toBe(true);
    expect(canAttachBlueprint(ada, mine, "bo")).toBe(false);
    expect(canAttachBlueprint(ada, shared, "bo")).toBe(true);
    expect(canAttachBlueprint(ada, theirs, "ada")).toBe(false);
    expect(canAttachBlueprint(actor("superuser", "admin"), theirs, "ada")).toBe(true);
    expect(canAttachBlueprint(actor("owner", "ada", false), shared, "ada")).toBe(false);
    expect(canAttachBlueprint(actor("superuser", "admin", false), theirs, "ada")).toBe(false);
  });

  it("lets an operator manage only their own sinks", () => {
    const op = actor("operator", "op");
    const mine = { createdById: "op" };
    const theirs = { createdById: "other" };
    expect(canManageSinks(op)).toBe(true);
    expect(visibleSinks(op, [mine, theirs])).toEqual([mine]);
    expect(visibleSinks(actor("superuser", "admin"), [mine, theirs])).toEqual([mine, theirs]);
    expect(visibleSinks(actor("owner"), [mine])).toEqual([]);
    expect(visibleSinks(actor("staff", "pat"), [mine])).toEqual([]);
    expect(canManageSinks(actor("operator", "op", false))).toBe(false);
    expect(visibleSinks(actor("superuser", "admin", false), [mine])).toEqual([]);
  });

  it("treats is_active as a verified owner", () => {
    expect(isVerifiedOwner(undefined)).toBe(false);
    expect(isVerifiedOwner({ is_active: false })).toBe(false);
    expect(isVerifiedOwner({ is_active: true })).toBe(true);
  });

  it("rebuilds a viewer from the console profile flags", () => {
    expect(viewerOf({ id: "ada", role: "member", is_superuser: false, is_staff: false, is_active: true })).toEqual(
      actor("owner"),
    );
    expect(viewerOf({ id: "op", role: "operator", is_superuser: false, is_staff: false, is_active: true })).toEqual(
      actor("operator", "op"),
    );
    expect(viewerOf({ id: "pat", role: "member", is_superuser: false, is_staff: true, is_active: true })).toEqual(
      actor("staff", "pat"),
    );
    expect(viewerOf({ id: "admin", role: "member", is_superuser: true, is_staff: true, is_active: false })).toEqual(
      actor("superuser", "admin", false),
    );
  });
});
