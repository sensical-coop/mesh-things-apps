import type { Mesh, SourceRead } from "@mtt/contracts";
import { useCallback, useMemo } from "react";
import { meshStatus, type MeshStatus } from "@/features/mesh/model";
import { sourceStatus } from "@/features/source/model";
import { useMeshTerms } from "@/features/terms/use-mesh-terms";

/** `meshStatus` with the instance's terms and the mesh's source filled in. Pass the sources the viewer can see. */
export function useMeshStatus(sources: readonly SourceRead[]): (mesh: Mesh) => MeshStatus {
  const { enforced, current } = useMeshTerms();
  const sourceStatusById = useMemo(
    () => new Map(sources.map((source) => [source.id, sourceStatus(source.status)])),
    [sources],
  );
  return useCallback(
    (mesh) =>
      meshStatus(mesh, {
        termsEnforced: enforced,
        currentTermsVersion: current?.version,
        sourceStatus: mesh.source_id ? sourceStatusById.get(mesh.source_id) : undefined,
        now: new Date(),
      }),
    [enforced, current?.version, sourceStatusById],
  );
}
