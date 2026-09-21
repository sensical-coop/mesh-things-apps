import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FramePanel } from "@mtt/ui/reui/frame";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type FormEvent, type ReactElement, type ReactNode, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { FormField } from "@/components/form/form-field";
import { Input } from "@mtt/ui/components/ui/input";
import { routes } from "@/router";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";

export function ForgotPasswordForm(): ReactElement {
  const { formatMessage } = useIntl();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestReset = useMutation({
    ...authRepository.requestPasswordReset(),
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    setError(null);
    await authRepository.csrf();
    try {
      await requestReset.mutateAsync({ body: { email } });
      setSubmittedEmail(email);
    } catch {
      setError(
        formatMessage({
          id: "page.forgotPassword.form.error",
          defaultMessage: "We couldn't send the reset link. Try again in a moment.",
        }),
      );
    }
  }

  if (submittedEmail) {
    return (
      <Frame className="shadow-card w-full" spacing="lg">
        <FramePanel className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-title-2-medium tracking-tight text-text-primary">
              {formatMessage({ id: "page.forgotPassword.sent.title", defaultMessage: "Check your email" })}
            </h1>
            <StatusCopy>
              <FormattedMessage
                id="page.forgotPassword.sent.body"
                defaultMessage="If an account exists for {email}, we've sent a link to reset the password."
                values={{ email: submittedEmail }}
              />
            </StatusCopy>
          </div>
          <Link to={routes.login} className="text-body-medium text-text-primary underline underline-offset-2">
            {formatMessage({ id: "page.forgotPassword.sent.backToSignIn", defaultMessage: "Back to sign in" })}
          </Link>
        </FramePanel>
      </Frame>
    );
  }

  return (
    <Frame className="shadow-card w-full" spacing="lg">
      <FramePanel className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-2-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.forgotPassword.form.title", defaultMessage: "Reset your password" })}
          </h1>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.forgotPassword.form.subtitle",
              defaultMessage: "Enter the email on your owner account and we'll send you a reset link.",
            })}
          </p>
        </div>
        <form className="flex flex-col gap-5" onSubmit={(e) => void onSubmit(e)}>
          <FieldGroup>
            <FormField
              id="forgot-password-email"
              label={formatMessage({ id: "page.forgotPassword.form.email", defaultMessage: "Email" })}
            >
              <Input id="forgot-password-email" name="email" type="email" required autoComplete="username" />
            </FormField>
          </FieldGroup>
          {error ? <StatusCopy>{error}</StatusCopy> : null}
          <Button type="submit" size="small" disabled={requestReset.isPending} className="mt-1">
            {requestReset.isPending
              ? formatMessage({ id: "page.forgotPassword.form.sending", defaultMessage: "Sending" })
              : formatMessage({ id: "page.forgotPassword.form.submit", defaultMessage: "Send reset link" })}
          </Button>
        </form>
        <p className="text-caption-1-regular text-text-tertiary">
          <FormattedMessage
            id="page.forgotPassword.form.backToSignIn"
            defaultMessage="Remembered your password? <link>Sign in</link>."
            values={{
              link: (chunks: ReactNode) => (
                <Link to={routes.login} className="underline underline-offset-2 text-accent-500">
                  {chunks}
                </Link>
              ),
            }}
          />
        </p>
      </FramePanel>
    </Frame>
  );
}
