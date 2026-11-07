import { type ReactElement } from "react";
import { AuthPage } from "@/features/auth/ui/auth-page";
import { guestRedirect, useSessionProbe } from "@/features/auth/guest-gate";
import { SignupForm } from "./form";

export function SignupPage(): ReactElement {
  const redirect = guestRedirect(useSessionProbe());
  if (redirect) return redirect;

  return (
    <AuthPage>
      <SignupForm />
    </AuthPage>
  );
}
