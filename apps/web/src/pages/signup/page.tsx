import { type ReactElement } from "react";
import { GuestPage } from "@/features/auth/guest-gate";
import { SignupForm } from "./form";

export function SignupPage(): ReactElement {
  return (
    <GuestPage>
      <SignupForm />
    </GuestPage>
  );
}
