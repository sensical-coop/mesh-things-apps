import { useSearch } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { AuthHeader } from "@/components/auth-header";
import { safeReturnPath } from "@/lib/return-path";
import { routes } from "@/router";
import { ShaderBackdrop } from "@/components/auth-shader-backdrop";
import { guestRedirect, useSessionProbe } from "@/features/auth/guest-gate";
import { LoginForm } from "./form";

export function LoginPage(): ReactElement {
  const { accountDeleted, next } = useSearch({ from: routes.login });
  const me = useSessionProbe();
  const redirect = guestRedirect(me, safeReturnPath(next));
  if (redirect) return redirect;

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
