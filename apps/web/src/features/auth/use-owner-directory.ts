import type { OwnerProfile } from "@mtt/contracts";
import { useQuery } from "@tanstack/react-query";
import { authRepository } from "@/features/auth/repository";

export function useOwnerDirectory(): {
  me: OwnerProfile | undefined;
  isSuperuser: boolean;
  meId: string | undefined;
  ownerName: (ownerId: string) => string;
} {
  const me = useQuery({ ...authRepository.me(), retry: false });
  // The directory (id + name) is readable by every verified owner, and now that
  // public meshes show up in lists, everyone needs names for them.
  const owners = useQuery({ ...authRepository.list(), enabled: me.data != null });
  const namesById = new Map((owners.data ?? []).map((owner) => [owner.id, owner.name]));

  return {
    me: me.data,
    isSuperuser: me.data?.is_superuser === true,
    meId: me.data?.id,
    ownerName: (ownerId) => namesById.get(ownerId) ?? ownerId,
  };
}
