import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import type { ReactNode } from "react";
import { landingHomePage } from "@/pages/home/route";
import { authLoginPage } from "@/pages/login/route";
import { authSignupPage } from "@/pages/signup/route";
import { authVerifyPendingPage } from "@/pages/verify-pending/route";
import { authVerifyEmailPage } from "@/pages/verify-email/route";
import { legalTermsPage } from "@/pages/terms/route";
import { alarmListPage } from "@/pages/alarms/list/route";
import { blueprintListPage } from "@/pages/blueprints/list/route";
import { deviceDetailPage } from "@/pages/devices/detail/route";
import { deviceListPage } from "@/pages/devices/list/route";
import { meshDetailPage } from "@/pages/meshes/detail/route";
import { meshListPage } from "@/pages/meshes/list/route";
import { profilePage } from "@/pages/profile/route";
import { routes } from "./router.ts";
import { Shell } from "@/layout";

const rootRoute = createRootRoute({
  component: Outlet,
});

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  ...landingHomePage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  ...authLoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  ...authSignupPage,
});

const verifyPendingRoute = createRoute({
  getParentRoute: () => rootRoute,
  ...authVerifyPendingPage,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  ...authVerifyEmailPage,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  ...legalTermsPage,
});

const consoleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: routes.console,
  component: Shell,
});

const consoleIndexRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: routes.consoleChild.index,
  beforeLoad: () => {
    throw redirect({ to: routes.meshes });
  },
});

const meshesRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...meshListPage,
});

const meshDetailRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...meshDetailPage,
});

const devicesRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...deviceListPage,
});

const deviceDetailRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...deviceDetailPage,
});

const alarmsRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...alarmListPage,
});

const blueprintsRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...blueprintListPage,
});

const profileRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...profilePage,
});

const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  signupRoute,
  verifyPendingRoute,
  verifyEmailRoute,
  termsRoute,
  consoleRoute.addChildren([
    consoleIndexRoute,
    meshesRoute,
    meshDetailRoute,
    devicesRoute,
    deviceDetailRoute,
    alarmsRoute,
    blueprintsRoute,
    profileRoute,
  ]),
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
