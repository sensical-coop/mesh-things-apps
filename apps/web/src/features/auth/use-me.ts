import type { OwnerProfile } from "@mtt/contracts";
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
  return {
    me: me.data,
    isSuperuser: me.data?.is_superuser === true,
    isOperator: isOperator(me.data),
    meId: me.data?.id,
  };
}
