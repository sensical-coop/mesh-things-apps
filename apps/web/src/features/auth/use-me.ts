import type { OwnerProfile } from "@mtt/contracts";
import { canDecideOperatorRequests, canSeeDataDeletions, viewerOf } from "@mtt/contracts/authz";
import { useQuery } from "@tanstack/react-query";
import { authRepository } from "@/features/auth/repository";
import { isOperator } from "@/features/auth/session";

export function useMe(): {
  me: OwnerProfile | undefined;
  isSuperuser: boolean;
  isOperator: boolean;
  meId: string | undefined;
} {
  const me = useQuery(authRepository.me());
  const viewer = me.data ? viewerOf(me.data) : undefined;
  return {
    me: me.data,
    isSuperuser: viewer != null && (canDecideOperatorRequests(viewer) || canSeeDataDeletions(viewer)),
    isOperator: isOperator(me.data),
    meId: me.data?.id,
  };
}
