import type { OwnerProfile } from "@mtt/contracts";
import { useQuery } from "@tanstack/react-query";
import { authRepository } from "@/features/auth/repository";
import { useMe } from "@/features/auth/use-me";

/**
 * `useMe` plus every owner's name, for views that show who owns something.
 * Fetches the whole directory, so use `useMe` when names aren't shown.
 */
export function useOwnerDirectory(): {
  me: OwnerProfile | undefined;
  isSuperuser: boolean;
  isOperator: boolean;
  meId: string | undefined;
  ownerName: (ownerId: string) => string;
} {
  const self = useMe();
  // The directory (id + name) is readable by every verified owner, and now that
  // public meshes show up in lists, everyone needs names for them.
  const owners = useQuery({ ...authRepository.list(), enabled: self.me != null });
  const namesById = new Map((owners.data ?? []).map((owner) => [owner.id, owner.name]));

  return { ...self, ownerName: (ownerId) => namesById.get(ownerId) ?? ownerId };
}
