import { authRepository } from "@/features/auth/repository";
import { cx } from "@mtt/ui/utils";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, RouterProvider } from "@tanstack/react-router";
import { type ComponentProps, type ReactElement } from "react";
import { pageWidth } from "@/components/brand";
import { Footer } from "@/footer";
import { Header } from "@/header";
import { routes } from "@/router";

export function Layout({ router }: ComponentProps<typeof RouterProvider>): ReactElement {
  return <RouterProvider router={router} />;
}

export function Shell(): ReactElement {
  const me = useQuery({ ...authRepository.me(), retry: false });

  if (me.isPending) {
    return <div className="min-h-svh bg-background-full" />;
  }
  if (me.error) {
    return <Navigate to={routes.login} />;
  }

  return (
    <div className="flex min-h-svh min-w-0 flex-col bg-background-full">
      <Header />
      <main className={cx(pageWidth, "flex-1 pt-[calc(5.5rem+env(safe-area-inset-top))] pb-16 sm:pb-24")}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
