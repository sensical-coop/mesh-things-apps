import { safeReturnPath } from "@mtt/contracts/site";
import { useSearch } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { GuestPage } from "@/features/auth/guest-gate";
import { routes } from "@/router";
import { LoginForm } from "./form";

export function LoginPage(): ReactElement {
  const { accountDeleted, next } = useSearch({ from: routes.login });

  return (
    <GuestPage next={safeReturnPath(next)}>
      <LoginForm accountDeleted={accountDeleted} />
    </GuestPage>
  );
}
