import { createRootRoute, createRoute, createRouter, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import type { ReactNode } from "react";
import { DeviceDetailPage } from "./device-detail-page";
import { DevicesPage } from "./devices-page";
import { LoginPage } from "./login-page";
import { MeshDetailPage } from "./mesh-detail-page";
import { MeshesPage } from "./meshes-page";
import { BlueprintsPage } from "./blueprints-page";
import { Shell } from "./shell";

function RootLayout() {
  const login = useRouterState({ select: (s) => s.location.pathname === "/login" });
  if (login) return <Outlet />;
  return <Shell />;
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/meshes" });
  },
});

const meshesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/meshes",
  component: MeshesPage,
});

const meshDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/meshes/$meshId",
  component: MeshDetailPage,
});

const devicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/devices",
  component: DevicesPage,
});

const deviceDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/devices/$deviceUuid",
  component: DeviceDetailPage,
});

const blueprintsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/blueprints",
  component: BlueprintsPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  indexRoute,
  meshesRoute,
  meshDetailRoute,
  devicesRoute,
  deviceDetailRoute,
  blueprintsRoute,
]);

export const router = createRouter({
  routeTree,
  InnerWrap: function InnerWrap({ children }: { children: ReactNode }) {
    return <NuqsAdapter>{children}</NuqsAdapter>;
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
