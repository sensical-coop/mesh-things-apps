import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FramePanel } from "@mtt/ui/reui/frame";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { FormField } from "@/components/form/form-field";
import { Input } from "@mtt/ui/components/ui/input";
import { routes } from "@/router";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";

type FormatMessage = ReturnType<typeof useIntl>["formatMessage"];

/** Django validation errors come back as `{ field: ["message", ...] }`. */
function fieldErrorMessages(body: Record<string, unknown>): string[] {
  const value = body.new_password;
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function formatResetError(error: unknown, formatMessage: FormatMessage): { message: string; expired: boolean } {
  const body = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};

  if (body.token !== undefined) {
    return {
      expired: true,
      message: formatMessage({
        id: "page.resetPassword.invalidLink.body",
        defaultMessage: "This password reset link is invalid or has expired.",
      }),
    };
  }

  const fieldMessages = fieldErrorMessages(body);
  if (fieldMessages.length > 0) return { expired: false, message: fieldMessages.join(" ") };

  return {
    expired: false,
    message: formatMessage({
      id: "page.resetPassword.form.error.generic",
      defaultMessage: "Something went wrong. Check the details and try again.",
    }),
  };
}

function InvalidLinkPanel(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <Frame className="shadow-card w-full" spacing="lg">
      <FramePanel className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-2-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.resetPassword.invalidLink.title", defaultMessage: "Invalid link" })}
          </h1>
          <StatusCopy>
            {formatMessage({
              id: "page.resetPassword.invalidLink.body",
              defaultMessage: "This password reset link is invalid or has expired.",
            })}
          </StatusCopy>
        </div>
        <Link
          to={routes.forgotPassword}
          className="text-body-medium text-text-primary underline underline-offset-2"
        >
          {formatMessage({ id: "page.resetPassword.invalidLink.requestNew", defaultMessage: "Request a new link" })}
        </Link>
      </FramePanel>
    </Frame>
  );
}

function SuccessPanel(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <Frame className="shadow-card w-full" spacing="lg">
      <FramePanel className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-2-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.resetPassword.success.title", defaultMessage: "Password updated" })}
          </h1>
          <StatusCopy>
            {formatMessage({
              id: "page.resetPassword.success.body",
              defaultMessage: "Your password has been changed. Sign in with your new password.",
            })}
          </StatusCopy>
        </div>
        <Link to={routes.login} className="text-body-medium text-text-primary underline underline-offset-2">
          {formatMessage({ id: "page.resetPassword.success.goToSignIn", defaultMessage: "Go to sign in" })}
        </Link>
      </FramePanel>
    </Frame>
  );
}

export function ResetPasswordForm({ token }: { token: string | null }): ReactElement {
  const { formatMessage } = useIntl();
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const resetPassword = useMutation({
    ...authRepository.resetPassword(),
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("new_password") ?? "");
    const confirmPassword = String(form.get("confirm_password") ?? "");
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(
        formatMessage({ id: "page.resetPassword.form.error.mismatch", defaultMessage: "Passwords don't match." }),
      );
      return;
    }

    try {
      await resetPassword.mutateAsync({ body: { token, new_password: newPassword } });
      setSucceeded(true);
    } catch (caught) {
      const formatted = formatResetError(caught, formatMessage);
      if (formatted.expired) {
        setExpired(true);
      } else {
        setError(formatted.message);
      }
    }
  }

  if (succeeded) return <SuccessPanel />;
  if (!token || expired) return <InvalidLinkPanel />;

  return (
    <Frame className="shadow-card w-full" spacing="lg">
      <FramePanel className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-2-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.resetPassword.form.title", defaultMessage: "Set a new password" })}
          </h1>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.resetPassword.form.subtitle",
              defaultMessage: "Enter a new password for your account.",
            })}
          </p>
        </div>
        <form className="flex flex-col gap-5" onSubmit={(e) => void onSubmit(e)}>
          <FieldGroup>
            <FormField
              id="reset-password-new"
              label={formatMessage({ id: "page.resetPassword.form.newPassword", defaultMessage: "New password" })}
            >
              <Input
                id="reset-password-new"
                name="new_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </FormField>
            <FormField
              id="reset-password-confirm"
              label={formatMessage({
                id: "page.resetPassword.form.confirmPassword",
                defaultMessage: "Confirm password",
              })}
            >
              <Input
                id="reset-password-confirm"
                name="confirm_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </FormField>
          </FieldGroup>
          {error ? <StatusCopy>{error}</StatusCopy> : null}
          <Button type="submit" size="small" disabled={resetPassword.isPending} className="mt-1">
            {resetPassword.isPending
              ? formatMessage({ id: "page.resetPassword.form.submitting", defaultMessage: "Resetting" })
              : formatMessage({ id: "page.resetPassword.form.submit", defaultMessage: "Reset password" })}
          </Button>
        </form>
      </FramePanel>
    </Frame>
  );
}
