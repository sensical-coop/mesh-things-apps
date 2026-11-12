import { useState } from "react";
import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { classifyLoginFailure, type LoginFailure } from "./api-errors";
import {
  getOwnersLoginCreateMutationOptions,
  getOwnersLogoutCreateMutationOptions,
  getOwnersMeRetrieveQueryKey,
} from "./generated/api";
import type { OwnerProfile } from "./generated/model.zod";

/** Refetch the signed-in owner after anything that changes their session, role, terms or profile. */
export function invalidateMe(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: getOwnersMeRetrieveQueryKey() });
}

/** Login call, `me` invalidation and the failure the form shows. `onSignedIn` runs once `me` is fresh. */
export function useLogin(onSignedIn?: (owner: OwnerProfile) => Promise<void> | void) {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const login = useMutation({
    ...getOwnersLoginCreateMutationOptions(),
    onSuccess: async (owner) => {
      await invalidateMe(queryClient);
      await onSignedIn?.(owner);
    },
  });

  async function submit(values: { email: string; password: string }) {
    setFailure(null);
    try {
      await login.mutateAsync({ data: values });
    } catch (caught) {
      setFailure(classifyLoginFailure(caught));
    }
  }

  return { failure, pending: login.isPending, submit };
}

/** Logout call, then every cached query is dropped (they belong to the old session) and `onDone` runs. */
export function useLogout(onDone: () => Promise<void> | void) {
  const queryClient = useQueryClient();
  const logout = useMutation({
    ...getOwnersLogoutCreateMutationOptions(),
    onSuccess: async () => {
      queryClient.clear();
      await onDone();
    },
  });
  return { pending: logout.isPending, logout: () => logout.mutate() };
}
