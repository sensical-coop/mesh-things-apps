import { useQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { routes } from "@/router";
import { ShaderBackdrop } from "./shader-backdrop";
import { authRepository } from "@/features/auth/repository";
import { isOwnerSession } from "@/features/auth/session";
import { LoginForm } from "./form";

export function LoginPage(): ReactElement {
  const me = useQuery({ ...authRepository.me(), retry: false });
  if (isOwnerSession(me)) return <Navigate to={routes.meshes} />;

  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-background-secondary-default px-4 py-16 sm:px-6 sm:py-24">
      <ShaderBackdrop />
      <div className="relative w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
