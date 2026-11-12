import { type ReactElement } from "react";
import { GuestPage } from "@/features/auth/guest-gate";
import { ForgotPasswordForm } from "./form";

export function ForgotPasswordPage(): ReactElement {
  return (
    <GuestPage>
      <ForgotPasswordForm />
    </GuestPage>
  );
}
