import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useMe } from "@/features/auth/use-me";
import { meshRepository } from "@/features/mesh/repository";

/** The meshes the viewer can see, by id, and whether a list built on them should say whose each one is. */
export function useMeshDirectory() {
  const { isSuperuser, meId } = useMe();
  const query = useQuery(meshRepository.list());
  const byId = useMemo(() => new Map((query.data ?? []).map((mesh) => [mesh.id, mesh])), [query.data]);
  /** Public meshes can belong to someone else, so superusers and anyone seeing another owner's mesh get an owner column. */
  const showOwner = (ownerIds: Iterable<string | undefined>) =>
    isSuperuser || [...ownerIds].some((ownerId) => ownerId !== meId);
  return { query, byId, showOwner };
}
