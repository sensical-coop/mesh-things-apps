import { SITE_PATHS } from "@mtt/contracts/site";
import { useSignup } from "@mtt/contracts/signup";
import { SignupForm as UiSignupForm } from "@mtt/ui/forms/signup-form";
import { type ReactElement } from "react";

export function SignupForm(): ReactElement {
  const { failure, pending, terms, termsLoading, termsLoadFailed, termsResetKey, submit } = useSignup({
    next: SITE_PATHS.start,
  });

  return (
    <UiSignupForm
      failure={failure}
      pending={pending}
      terms={terms}
      termsHref={SITE_PATHS.terms}
      termsLoading={termsLoading}
      termsLoadFailed={termsLoadFailed}
      termsResetKey={termsResetKey}
      onSubmit={(values) => void submit(values)}
    />
  );
}
