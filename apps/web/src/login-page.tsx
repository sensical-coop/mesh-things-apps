import { ownersMeRetrieveOptions } from "@mtt/contracts/query";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { LoginForm } from "./login-form";
import { ShaderBackdrop } from "./shader-backdrop";

export function LoginPage(): ReactElement {
  const me = useQuery({ ...ownersMeRetrieveOptions(), retry: false });
  if (me.data) return <Navigate to="/meshes" />;

  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-background-secondary-default px-4 py-16 sm:px-6 sm:py-24">
      <ShaderBackdrop />
      <div className="relative w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
