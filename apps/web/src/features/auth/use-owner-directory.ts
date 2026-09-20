import { useQuery } from "@tanstack/react-query";
import { authRepository } from "@/features/auth/repository";

export function useOwnerDirectory(): {
  isSuperuser: boolean;
  meId: string | undefined;
  ownerName: (ownerId: string) => string;
} {
  const me = useQuery({ ...authRepository.me(), retry: false });
  const isSuperuser = me.data?.is_superuser === true;
  const owners = useQuery({ ...authRepository.list(), enabled: isSuperuser });
  const namesById = new Map((owners.data ?? []).map((owner) => [owner.id, owner.name]));

  return {
    isSuperuser,
    meId: me.data?.id,
    ownerName: (ownerId) => namesById.get(ownerId) ?? ownerId,
  };
}
