import { parseAsString, useQueryState } from "nuqs";
import { type ReactElement } from "react";
import { AuthPage } from "@/features/auth/ui/auth-page";
import { ResetPasswordForm } from "./form";

export function ResetPasswordPage(): ReactElement {
  const [token] = useQueryState("token", parseAsString);

  return (
    <AuthPage>
      <ResetPasswordForm token={token} />
    </AuthPage>
  );
}
