import type { OwnerProfile } from "@mtt/contracts";
import {
  canDecideOperatorRequests,
  canOperate,
  canSeeDataDeletions,
  viewerOf,
  type Viewer,
} from "@mtt/contracts/authz";
import { useQuery } from "@tanstack/react-query";
import { authRepository } from "@/features/auth/repository";

/** The signed-in owner and what they may do. Role flags stay false while `me` is missing, so gated UI stays hidden. */
export function useMe(): {
  me: OwnerProfile | undefined;
  isPending: boolean;
  viewer: Viewer | undefined;
  isSuperuser: boolean;
  isOperator: boolean;
  meId: string | undefined;
} {
  const query = useQuery(authRepository.me());
  const viewer = query.data ? viewerOf(query.data) : undefined;
  return {
    me: query.data,
    isPending: query.isPending,
    viewer,
    isSuperuser: viewer != null && (canDecideOperatorRequests(viewer) || canSeeDataDeletions(viewer)),
    isOperator: viewer != null && canOperate(viewer),
    meId: query.data?.id,
  };
}
