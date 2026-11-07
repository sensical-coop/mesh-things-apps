import { useSignup } from "@mtt/contracts/signup";
import { SignupForm as UiSignupForm } from "@mtt/ui/forms/signup-form";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export function SignupForm(): ReactElement {
  const { formatMessage } = useIntl();
  const { failure, pending, termsOff, terms, termsLoading, termsLoadFailed, termsResetKey, submit } = useSignup({
    next: "/start",
  });

  return (
    <UiSignupForm
      failure={failure}
      pending={pending}
      terms={
        termsOff
          ? null
          : terms
            ? {
                title: terms.title,
                description: terms.description,
                statements: terms.statements,
                footnote: (
                  <>
                    {terms.footnote}{" "}
                    <a className="text-accent-500 underline underline-offset-2" href="/terms" target="_blank" rel="noreferrer">
                      {formatMessage({ id: "feature.terms.termsLink", defaultMessage: "Read the Mesh Things Terms." })}
                    </a>
                  </>
                ),
              }
            : null
      }
      termsLoading={termsLoading}
      termsLoadFailed={termsLoadFailed}
      termsResetKey={termsResetKey}
      onSubmit={(values) => void submit(values)}
    />
  );
}
