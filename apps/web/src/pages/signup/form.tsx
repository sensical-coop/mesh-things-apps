import { useSignup } from "@mtt/contracts/signup";
import { SignupForm as UiSignupForm } from "@mtt/ui/forms/signup-form";
import { Frame, FramePanel } from "@mtt/ui/reui/frame";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { routes } from "@/router";

const linkClass = "text-accent-500 underline underline-offset-2";

export function SignupForm({ next }: { next?: string } = {}): ReactElement {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { failure, pending, termsOff, terms, termsLoading, termsLoadFailed, termsResetKey, submit } = useSignup({
    next,
    onSignedUp: () => navigate({ to: routes.verifyPending }),
  });

  const termsCopy = termsOff
    ? null
    : terms
      ? {
          title: terms.title,
          description: terms.description,
          statements: terms.statements,
          footnote: (
            <>
              {terms.footnote}{" "}
              <Link to={routes.terms} target="_blank" className={linkClass}>
                {formatMessage({ id: "feature.terms.termsLink", defaultMessage: "Read the Mesh Things Terms." })}
              </Link>
            </>
          ),
        }
      : null;

  return (
    <Frame className="w-full shadow-card" spacing="lg">
      <FramePanel className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-2-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.signup.form.title", defaultMessage: "Create your account" })}
          </h1>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.signup.form.subtitle",
              defaultMessage: "Register an owner account for Mesh Things.",
            })}
          </p>
        </div>
        <UiSignupForm
          failure={failure}
          pending={pending}
          terms={termsCopy}
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
                    <Link to={routes.login} className={linkClass}>
                      {chunks}
                    </Link>
                  ),
                }}
              />
            </p>
          }
        />
      </FramePanel>
    </Frame>
  );
}
