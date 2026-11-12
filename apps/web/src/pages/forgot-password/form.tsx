import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type FormEvent, type ReactElement, type ReactNode, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { FormField } from "@mtt/ui/forms/form-field";
import { Input } from "@mtt/ui/components/ui/input";
import { routes } from "@/router";
import { StatusCopy } from "@/components/status-copy";
import { AuthCard } from "@/features/auth/ui/auth-card";
import { authLinkClass } from "@/features/auth/ui/auth-link-class";
import { inlineLinkClass } from "@/lib/link-class";
import { readApiError } from "@mtt/contracts/errors";
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
    try {
      await requestReset.mutateAsync({ data: { email } });
      setSubmittedEmail(email);
    } catch (failure) {
      setError(
        readApiError(failure).fields.email ??
          formatMessage({
            id: "page.forgotPassword.form.error",
            defaultMessage: "We couldn't send the reset link. Try again in a moment.",
          }),
      );
    }
  }

  if (submittedEmail) {
    return (
      <AuthCard
        title={formatMessage({ id: "page.forgotPassword.sent.title", defaultMessage: "Check your email" })}
        subtitle={
          <FormattedMessage
            id="page.forgotPassword.sent.body"
            defaultMessage="If an account exists for {email}, we'll send a link to reset the password."
            values={{ email: submittedEmail }}
          />
        }
      >
        <Link to={routes.login} className={authLinkClass}>
          {formatMessage({ id: "page.forgotPassword.sent.backToSignIn", defaultMessage: "Back to sign in" })}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={formatMessage({ id: "page.forgotPassword.form.title", defaultMessage: "Reset your password" })}
      subtitle={formatMessage({
        id: "page.forgotPassword.form.subtitle",
        defaultMessage: "Enter your email and we'll send you a reset link if it exists.",
      })}
    >
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
              <Link to={routes.login} className={inlineLinkClass}>
                {chunks}
              </Link>
            ),
          }}
        />
      </p>
    </AuthCard>
  );
}
