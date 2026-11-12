import { viewerOf, type Viewer } from "@mtt/contracts/authz";
import { Navigate } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";
import { useMe } from "@/features/auth/use-me";
import { routes } from "@/router";

/**
 * Stays put while `me` loads (children stay unmounted, so the page does not fetch),
 * then sends anyone `allow` refuses to the mesh list.
 */
export function RequireRole({
  allow,
  children,
}: {
  allow: (viewer: Viewer) => boolean;
  children: ReactNode;
}): ReactElement | null {
  const { me } = useMe();
  if (!me) return null;
  if (!allow(viewerOf(me))) return <Navigate to={routes.meshes} replace />;
  return <>{children}</>;
}
