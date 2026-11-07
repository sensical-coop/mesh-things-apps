import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getOwnersMeResendVerificationCreateMutationOptions, getOwnersMeRetrieveQueryKey } from "./generated/api";
import { secondsUntilResendAllowed } from "./resend-cooldown";

/** Cooldown clock, resend mutation, and `me` invalidation. `next` is the allow-listed return path. */
export function useResendVerification(sentAt: string | null, next?: string): {
  remaining: number;
  pending: boolean;
  failed: boolean;
  resend: () => void;
} {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const resend = useMutation({
    ...getOwnersMeResendVerificationCreateMutationOptions(),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: getOwnersMeRetrieveQueryKey() });
    },
  });

  return {
    remaining: secondsUntilResendAllowed(sentAt, now),
    pending: resend.isPending,
    failed: resend.isError,
    resend: () => resend.mutate(next ? { data: { next } } : {}),
  };
}
