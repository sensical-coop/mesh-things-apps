import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { FormField } from "@mtt/ui/forms/form-field";
import { PASSWORD_MIN_LENGTH } from "@mtt/ui/forms/password";
import { Input } from "@mtt/ui/components/ui/input";
import { StatusCopy } from "@/components/status-copy";
import { errorMessages, readApiError } from "@mtt/contracts/errors";
import { authRepository } from "@/features/auth/repository";
import { AuthCard } from "@/features/auth/ui/auth-card";
import { InvalidLinkPanel } from "./invalid-link-panel";
import { SuccessPanel } from "./success-panel";

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
      await resetPassword.mutateAsync({ data: { token, new_password: newPassword } });
      setSucceeded(true);
    } catch (caught) {
      if (readApiError(caught).fields.token !== undefined) {
        setExpired(true);
        return;
      }
      const passwordMessages =
        typeof caught === "object" && caught !== null && "new_password" in caught ? errorMessages(caught.new_password) : [];
      setError(
        passwordMessages.length > 0
          ? passwordMessages.join(" ")
          : formatMessage({
              id: "page.resetPassword.form.error.generic",
              defaultMessage: "Something went wrong. Check the details and try again.",
            }),
      );
    }
  }

  if (succeeded) return <SuccessPanel />;
  if (!token || expired) return <InvalidLinkPanel />;

  return (
    <AuthCard
      title={formatMessage({ id: "page.resetPassword.form.title", defaultMessage: "Set a new password" })}
      subtitle={formatMessage({
        id: "page.resetPassword.form.subtitle",
        defaultMessage: "Enter a new password for your account.",
      })}
    >
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
              minLength={PASSWORD_MIN_LENGTH}
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
              minLength={PASSWORD_MIN_LENGTH}
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
    </AuthCard>
  );
}
