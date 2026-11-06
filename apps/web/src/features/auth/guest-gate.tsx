import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import { type ReactElement } from "react";
import type { OwnerProfile } from "@mtt/contracts";
import { authRepository } from "@/features/auth/repository";
import { isOwnerSession } from "@/features/auth/session";
import { routes } from "@/router";

/** `GET /owners/me` for pages that are only for signed-out owners. */
export function useSessionProbe(): UseQueryResult<OwnerProfile> {
  return useQuery(authRepository.me());
}

type Probe = { isSuccess: boolean; data?: { is_active: boolean } };

/** An active session leaves a guest page. `href` is login's safe `next`. */
export function activeSessionRedirect(me: Probe, href?: string): ReactElement | null {
  if (!isOwnerSession(me)) return null;
  if (href) {
    window.location.assign(href);
    return <div className="min-h-svh bg-background-full" />;
  }
  return <Navigate to={routes.meshes} />;
}

/** Active session to meshes (or `href`); inactive session to verify-pending. */
export function guestRedirect(me: Probe, href?: string): ReactElement | null {
  return activeSessionRedirect(me, href) ?? (me.isSuccess && !me.data?.is_active ? <Navigate to={routes.verifyPending} /> : null);
}
