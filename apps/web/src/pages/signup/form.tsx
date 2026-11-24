import { useSignup } from "@mtt/contracts/signup";
import { SignupForm as UiSignupForm } from "@mtt/ui/forms/signup-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { AuthCard } from "@/features/auth/ui/auth-card";
import { inlineLinkClass } from "@/lib/link-class";
import { routes } from "@/router";

export function SignupForm(): ReactElement {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { failure, pending, terms, termsLoading, termsLoadFailed, termsResetKey, submit } = useSignup({
    onSignedUp: () => navigate({ to: routes.verifyPending }),
  });

  return (
    <AuthCard
      title={formatMessage({ id: "page.signup.form.title", defaultMessage: "Create your account" })}
      subtitle={formatMessage({
        id: "page.signup.form.subtitle",
        defaultMessage: "Register an owner account for Mesh Things.",
      })}
    >
      <UiSignupForm
        failure={failure}
        pending={pending}
        terms={terms}
        termsHref={routes.terms}
        termsLoading={termsLoading}
        termsLoadFailed={termsLoadFailed}
        termsResetKey={termsResetKey}
        onSubmit={(values) => void submit(values)}
        footer={
          <p className="text-caption-1-regular text-text-tertiary">
            <FormattedMessage
              id="page.signup.form.haveAccount"
              defaultMessage="Already have an account? <link>Sign in</link>."
              values={{
                link: (chunks: ReactNode) => (
                  <Link to={routes.login} className={inlineLinkClass}>
                    {chunks}
                  </Link>
                ),
              }}
            />
          </p>
        }
      />
    </AuthCard>
  );
}
