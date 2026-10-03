import type { OwnerProfile } from "@mtt/contracts";
import { useQuery } from "@tanstack/react-query";
import { authRepository } from "@/features/auth/repository";
import { canManageSources } from "@/features/source/model";

/** The signed-in owner and its roles, from the one shared `GET /owners/me` query. */
export function useMe(): {
  me: OwnerProfile | undefined;
  isSuperuser: boolean;
  isOperator: boolean;
  meId: string | undefined;
} {
  const me = useQuery({ ...authRepository.me(), retry: false });
  return {
    me: me.data,
    isSuperuser: me.data?.is_superuser === true,
    isOperator: canManageSources(me.data),
    meId: me.data?.id,
  };
}
