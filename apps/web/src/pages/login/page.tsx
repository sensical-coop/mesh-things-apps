import { useQuery } from "@tanstack/react-query";
import { Navigate, useSearch } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { AuthHeader } from "@/components/auth-header";
import { safeReturnPath } from "@/lib/return-path";
import { routes } from "@/router";
import { ShaderBackdrop } from "@/components/auth-shader-backdrop";
import { authRepository } from "@/features/auth/repository";
import { isOwnerSession } from "@/features/auth/session";
import { LoginForm } from "./form";

export function LoginPage(): ReactElement {
  const { accountDeleted, next } = useSearch({ from: routes.login });
  const me = useQuery({ ...authRepository.me(), retry: false });
  const dest = safeReturnPath(next);
  if (isOwnerSession(me)) {
    if (dest) {
      window.location.assign(dest);
      return <div className="min-h-svh bg-background-full" />;
    }
    return <Navigate to={routes.meshes} />;
  }
  if (me.isSuccess && !me.data.is_active) return <Navigate to={routes.verifyPending} />;

  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-background-secondary-default px-4 py-16 sm:px-6 sm:py-24">
      <ShaderBackdrop />
      <AuthHeader />
      <div className="relative w-full max-w-md">
        <LoginForm accountDeleted={accountDeleted} next={next} />
      </div>
    </main>
  );
}
