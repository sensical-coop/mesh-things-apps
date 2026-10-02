import type { OwnerProfile, OwnerPublic } from "@mtt/contracts";
import { useQuery } from "@tanstack/react-query";
import { authRepository } from "@/features/auth/repository";
import { canManageSources } from "@/features/source/model";

export function useOwnerDirectory(): {
  me: OwnerProfile | undefined;
  isSuperuser: boolean;
  isOperator: boolean;
  meId: string | undefined;
  owners: readonly OwnerPublic[];
  ownerName: (ownerId: string) => string;
} {
  const me = useQuery({ ...authRepository.me(), retry: false });
  // The directory (id + name) is readable by every verified owner, and now that
  // public and shared meshes show up in lists, everyone needs names for them.
  const owners = useQuery({ ...authRepository.list(), enabled: me.data != null });
  const namesById = new Map((owners.data ?? []).map((owner) => [owner.id, owner.name]));

  return {
    me: me.data,
    isSuperuser: me.data?.is_superuser === true,
    isOperator: canManageSources(me.data),
    meId: me.data?.id,
    owners: owners.data ?? [],
    ownerName: (ownerId) => namesById.get(ownerId) ?? ownerId,
  };
}
