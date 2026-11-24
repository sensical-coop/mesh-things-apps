import { authRepository } from "@/features/auth/repository";
import { BlankScreen } from "@/features/auth/ui/blank-screen";
import { isOwnerSession } from "@/features/auth/session";
import { cx } from "@mtt/ui/utils";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, RouterProvider } from "@tanstack/react-router";
import { type ComponentProps, type ReactElement } from "react";
import { pageWidth } from "@/components/brand";
import { TermsBanner } from "@/terms-banner";
import { Footer } from "@/footer";
import { Header } from "@/header";
import { routes } from "@/router";

export function Layout({ router }: ComponentProps<typeof RouterProvider>): ReactElement {
  return <RouterProvider router={router} />;
}

export function Shell(): ReactElement {
  const me = useQuery(authRepository.me());

  if (me.isPending) {
    return <BlankScreen />;
  }
  if (me.error) {
    return <Navigate to={routes.login} />;
  }
  if (!isOwnerSession(me)) {
    return <Navigate to={routes.verifyPending} />;
  }

  return (
    <div className="flex min-h-svh min-w-0 flex-col bg-background-full">
      <Header />
      <main className={cx(pageWidth, "flex-1 pt-[calc(5.5rem+env(safe-area-inset-top))] pb-16 sm:pb-24")}>
        <TermsBanner />
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
