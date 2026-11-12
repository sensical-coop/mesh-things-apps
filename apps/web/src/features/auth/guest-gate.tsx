import { useQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";
import { authRepository } from "@/features/auth/repository";
import { goToReturnPath, isOwnerSession } from "@/features/auth/session";
import { AuthPage } from "@/features/auth/ui/auth-page";
import { BlankScreen } from "@/features/auth/ui/blank-screen";
import { routes } from "@/router";

type Probe = { isSuccess: boolean; data?: { is_active: boolean } };

/** An active session leaves a guest page. `href` is login's safe `next`. */
export function activeSessionRedirect(me: Probe, href?: string): ReactElement | null {
  if (!isOwnerSession(me)) return null;
  if (href) {
    goToReturnPath(href);
    return <BlankScreen />;
  }
  return <Navigate to={routes.meshes} />;
}

/** The page of a signed-out visitor: an active session goes to meshes (or `next`), an inactive one to verify-pending. */
export function GuestPage({ next, children }: { next?: string; children: ReactNode }): ReactElement {
  const me = useQuery(authRepository.me());
  const redirect =
    activeSessionRedirect(me, next) ?? (me.isSuccess ? <Navigate to={routes.verifyPending} /> : null);
  return redirect ?? <AuthPage>{children}</AuthPage>;
}
