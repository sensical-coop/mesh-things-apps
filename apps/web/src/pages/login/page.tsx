import { useSearch } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { AuthPage } from "@/features/auth/ui/auth-page";
import { safeReturnPath } from "@/lib/return-path";
import { routes } from "@/router";
import { guestRedirect, useSessionProbe } from "@/features/auth/guest-gate";
import { LoginForm } from "./form";

export function LoginPage(): ReactElement {
  const { accountDeleted, next } = useSearch({ from: routes.login });
  const me = useSessionProbe();
  const redirect = guestRedirect(me, safeReturnPath(next));
  if (redirect) return redirect;

  return (
    <AuthPage>
      <LoginForm accountDeleted={accountDeleted} next={next} />
    </AuthPage>
  );
}
