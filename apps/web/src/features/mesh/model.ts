import type { Mesh } from "@mtt/contracts";
import { defineMessage } from "react-intl";
import { canWriteMesh, viewerOf, type ProfileFlags } from "@mtt/contracts/authz";
import type { SourceStatus } from "../source/model.ts";
import { termsStanding, type TermsStanding } from "../terms/model.ts";

/** Select and filter value for a mesh on the instance broker (no source). */
export const NO_SOURCE = "default";

/** What a mesh with no source is called: its traffic comes through this instance's broker. */
export const DEFAULT_BROKER = defineMessage({ id: "feature.mesh.defaultBroker", defaultMessage: "Default broker" });

export function meshTitle(mesh: Pick<Mesh, "channel_id" | "label">): string {
  return mesh.label?.trim() || mesh.channel_id;
}

/**
 * Mirrors the API's write rule: only the mesh's owner (or a superuser) may
 * change it. Public meshes are read-only for everyone else. An
 * unknown caller can't edit, so write affordances stay hidden while `me` loads.
 */
export function canEditMesh(mesh: Pick<Mesh, "owner_id">, me: ProfileFlags | undefined): boolean {
  if (!me) return false;
  return canWriteMesh(viewerOf(me), { ownerId: mesh.owner_id });
}

/**
 * Where a mesh stands with its mesh terms, or null when they don't apply: the mesh
 * is on a source (its source terms apply), or the API hides the fields (not the
 * caller's mesh).
 */
export function meshTermsStanding(
  mesh: Pick<Mesh, "source_id" | "terms_accepted_version" | "terms_expires_at" | "paused_at">,
  currentVersion: string | undefined,
  now: Date,
): TermsStanding | null {
  if (mesh.source_id !== null || mesh.terms_accepted_version === undefined) return null;
  return termsStanding({
    acceptedVersion: mesh.terms_accepted_version,
    expiresAt: mesh.terms_expires_at ?? null,
    pausedAt: mesh.paused_at ?? null,
    currentVersion,
    now,
  });
}

/**
 * Whether a mesh holds a current mesh-terms acceptance, wherever it is now. Pause is not part of
 * "current": a paused mesh moving back to the default broker keeps its acceptance when the version
 * still matches, which `meshTermsStanding` would call lapsed.
 */
export function meshTermsCurrent(
  mesh: Pick<Mesh, "terms_accepted_version" | "terms_expires_at">,
  currentVersion: string | undefined,
  now: Date,
): boolean {
  const standing = termsStanding({
    acceptedVersion: mesh.terms_accepted_version ?? null,
    expiresAt: mesh.terms_expires_at ?? null,
    pausedAt: null,
    currentVersion,
    now,
  });
  return standing === "ok" || standing === "expiring";
}

/**
 * What the Status column says about a mesh, most urgent first:
 * - `scheduledForDeletion`: its terms lapsed, so it stopped storing data and its readings
 *   will be deleted unless renewed;
 * - `sourcePaused` / `sourceDisconnected` / `sourceUnknown`: on a source, the source's state;
 * - `termsChanged` / `renewSoon`: terms to accept again, still storing data;
 * - `termsNotAccepted`: no acceptance on record; still stores data and never lapses;
 * - `active`;
 * - `hidden`: someone else's mesh, whose state the API doesn't show.
 */
export type MeshStatus =
  | { kind: "hidden" }
  | { kind: "active" }
  | { kind: "renewSoon"; expiresAt: string }
  | { kind: "termsChanged" }
  | { kind: "termsNotAccepted" }
  | { kind: "scheduledForDeletion"; since: string | null }
  | { kind: "sourcePaused" }
  | { kind: "sourceDisconnected" }
  | { kind: "sourceUnknown" };

export function meshStatus(
  mesh: Pick<Mesh, "source_id" | "terms_accepted_version" | "terms_expires_at" | "paused_at">,
  context: {
    /** False on an instance that asks for no terms (lite): nothing lapses there. */
    termsEnforced: boolean;
    currentTermsVersion: string | undefined;
    /** The bridge status of the mesh's source, when the caller can see it. */
    sourceStatus: SourceStatus | undefined;
    now: Date;
  },
): MeshStatus {
  if (mesh.source_id === undefined) return { kind: "hidden" };
  if (mesh.source_id !== null) {
    switch (context.sourceStatus) {
      case "paused":
        return { kind: "sourcePaused" };
      case "disconnected":
        return { kind: "sourceDisconnected" };
      case "connected":
        return { kind: "active" };
      default:
        return { kind: "sourceUnknown" };
    }
  }
  if (!context.termsEnforced) return { kind: "active" };
  const standing = meshTermsStanding(mesh, context.currentTermsVersion, context.now);
  switch (standing) {
    case "lapsed":
      return { kind: "scheduledForDeletion", since: mesh.paused_at ?? mesh.terms_expires_at ?? null };
    case "outdated":
      return { kind: "termsChanged" };
    case "expiring":
      return { kind: "renewSoon", expiresAt: mesh.terms_expires_at ?? "" };
    case "none":
      return { kind: "termsNotAccepted" };
    default:
      return { kind: "active" };
  }
}

export type ShownMeshStatus = Exclude<MeshStatus["kind"], "hidden">;

function inOrder<const T extends readonly ShownMeshStatus[]>(
  kinds: Exclude<ShownMeshStatus, T[number]> extends never ? T : never,
): T {
  return kinds;
}

/** Every status a mesh row can show, usable states first, then the ones that have stopped. A missing kind does not typecheck. */
export const SHOWN_MESH_STATUSES = inOrder([
  "active",
  "renewSoon",
  "termsChanged",
  "termsNotAccepted",
  "scheduledForDeletion",
  "sourcePaused",
  "sourceDisconnected",
  "sourceUnknown",
]);

/** For sorting the Status column: most urgent first. */
export const MESH_STATUS_RANK: Record<MeshStatus["kind"], number> = {
  scheduledForDeletion: 0,
  sourcePaused: 1,
  sourceDisconnected: 2,
  termsChanged: 3,
  renewSoon: 4,
  termsNotAccepted: 5,
  sourceUnknown: 6,
  active: 7,
  hidden: 8,
};
