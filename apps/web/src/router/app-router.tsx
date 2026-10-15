import { createRootRoute, createRoute, createRouter, lazyRouteComponent, Outlet, redirect } from "@tanstack/react-router";
import { docsPage } from "@/pages/docs/route";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import type { ReactNode } from "react";
import { landingHomePage } from "@/pages/home/route";
import { authLoginPage } from "@/pages/login/route";
import { authSignupPage } from "@/pages/signup/route";
import { authForgotPasswordPage } from "@/pages/forgot-password/route";
import { authResetPasswordPage } from "@/pages/reset-password/route";
import { authVerifyPendingPage } from "@/pages/verify-pending/route";
import { authVerifyEmailPage } from "@/pages/verify-email/route";
import { legalTermsPage } from "@/pages/terms/route";
import { legalDpaPage } from "@/pages/dpa/route";
import { alarmListPage } from "@/pages/alarms/list/route";
import { blueprintDetailPage } from "@/pages/blueprints/detail/route";
import { blueprintListPage } from "@/pages/blueprints/list/route";
import { deviceDetailPage } from "@/pages/devices/detail/route";
import { deviceListPage } from "@/pages/devices/list/route";
import { meshDetailPage } from "@/pages/meshes/detail/route";
import { meshListPage } from "@/pages/meshes/list/route";
import { profilePage } from "@/pages/profile/route";
import { sourceListPage } from "@/pages/sources/list/route";
import { sinkListPage } from "@/pages/sinks/list/route";
import { archivePage } from "@/pages/archive/route";
import { csvDownloadsPage } from "@/pages/csv-downloads/route";
import { operatorRequestDetailPage } from "@/pages/operator-requests/detail/route";
import { operatorRequestListPage } from "@/pages/operator-requests/list/route";
import { dataDeletionListPage } from "@/pages/data-deletions/list/route";
import { routes } from "./router.ts";
import { Shell } from "@/layout";
import { NotFound } from "@/components/not-found";

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

const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: routes.docs,
  component: lazyRouteComponent(() => import("@/pages/docs/layout"), "DocumentationLayout"),
});

const docsIndexRoute = createRoute({
  getParentRoute: () => docsRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: routes.docsPage, params: { _splat: "overview" } });
  },
});

const docsContentRoute = createRoute({
  getParentRoute: () => docsRoute,
  ...docsPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  ...authSignupPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  ...authForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  ...authResetPasswordPage,
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

const dpaRoute = createRoute({
  getParentRoute: () => rootRoute,
  ...legalDpaPage,
});

const consoleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: routes.console,
  component: Shell,
  // Unknown console paths render inside the Shell's outlet, chrome and all.
  notFoundComponent: () => <NotFound />,
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

const blueprintRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...blueprintDetailPage,
});

const sourcesRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...sourceListPage,
});

const sinksRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...sinkListPage,
});

const archiveRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...archivePage,
});

const csvDownloadsRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...csvDownloadsPage,
});

const operatorRequestsRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...operatorRequestListPage,
});

const operatorRequestRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...operatorRequestDetailPage,
});

const dataDeletionsRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...dataDeletionListPage,
});

const profileRoute = createRoute({
  getParentRoute: () => consoleRoute,
  ...profilePage,
});

const routeTree = rootRoute.addChildren([
  landingRoute,
  docsRoute.addChildren([docsIndexRoute, docsContentRoute]),
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyPendingRoute,
  verifyEmailRoute,
  termsRoute,
  dpaRoute,
  consoleRoute.addChildren([
    consoleIndexRoute,
    meshesRoute,
    meshDetailRoute,
    devicesRoute,
    deviceDetailRoute,
    alarmsRoute,
    blueprintsRoute,
    blueprintRoute,
    sourcesRoute,
    sinksRoute,
    archiveRoute,
    csvDownloadsRoute,
    operatorRequestsRoute,
    operatorRequestRoute,
    dataDeletionsRoute,
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
