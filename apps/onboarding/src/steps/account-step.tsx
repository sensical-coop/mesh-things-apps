import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { LoginForm } from "@/features/auth/login-form";
import { SignupForm } from "@/features/auth/signup-form";
import { StepHeading } from "./step-heading";

export function AccountStep(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <div className="flex flex-col gap-8">
      <StepHeading>
        {formatMessage({ id: "page.start.account.title", defaultMessage: "Create your account or sign in" })}
      </StepHeading>
      <SignupForm />
      <LoginForm />
    </div>
  );
}
