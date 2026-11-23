import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { SaveButton } from "@/components/form/save-button";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";
import { formLevelMessage, readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";

/** The profile's "Password" panel: confirms the current password and sets a new one. */
export function ChangePasswordPanel(): ReactElement {
  const { formatMessage } = useIntl();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const change = useMutation({
    ...authRepository.changePassword(),
    onError: (error) => setErrors(readApiError(error).fields),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("current_password") ?? "");
    const newPassword = String(form.get("new_password") ?? "");
    if (newPassword !== String(form.get("confirm_password") ?? "")) {
      setErrors({
        confirm_password: formatMessage({
          id: "page.profile.password.mismatch",
          defaultMessage: "Passwords don't match.",
        }),
      });
      return;
    }
    setErrors({});
    change.mutate(
      { body: { current_password: currentPassword, new_password: newPassword } },
      { onSuccess: () => formElement.reset() },
    );
  }

  return (
    <Frame className="shadow-card">
      <FrameHeader>
        <FrameTitle>{formatMessage({ id: "page.profile.password.title", defaultMessage: "Password" })}</FrameTitle>
        <FrameDescription>
          {formatMessage({
            id: "page.profile.password.description",
            defaultMessage: "Enter your current password to set a new one. You stay signed in.",
          })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <FieldGroup className="grid gap-x-8 gap-y-5 md:grid-cols-3">
            <FormField
              id="profile-password-current"
              label={formatMessage({ id: "page.profile.password.current", defaultMessage: "Current password" })}
              error={errors.current_password}
            >
              <Input
                id="profile-password-current"
                name="current_password"
                type="password"
                required
                autoComplete="current-password"
              />
            </FormField>
            <FormField
              id="profile-password-new"
              label={formatMessage({ id: "page.profile.password.new", defaultMessage: "New password" })}
              error={errors.new_password}
            >
              <Input
                id="profile-password-new"
                name="new_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </FormField>
            <FormField
              id="profile-password-confirm"
              label={formatMessage({ id: "page.profile.password.confirm", defaultMessage: "Confirm new password" })}
              error={errors.confirm_password}
            >
              <Input
                id="profile-password-confirm"
                name="confirm_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </FormField>
          </FieldGroup>
          {change.error ? (
            <StatusCopy>
              {formatMessage({
                id: "page.profile.password.error",
                defaultMessage: "The password was not changed. Check the fields and try again.",
              })}
              {formLevelMessage(change.error) ? ` ${formLevelMessage(change.error)}` : ""}
            </StatusCopy>
          ) : null}
          <div className={dialogActionsClass}>
            <SaveButton pending={change.isPending} saved={change.isSuccess} savedKey={change.submittedAt} />
          </div>
        </form>
      </FramePanel>
    </Frame>
  );
}
