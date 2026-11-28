import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";
import { formLevelMessage, readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";

/** Confirms the current password and sets a new one, opened from the profile's Account panel. */
export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const { formatMessage } = useIntl();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const change = useMutation({
    ...authRepository.changePassword(),
    onError: (error) => setErrors(readApiError(error).fields),
  });

  // Dismissing while a change is in flight would let its late response land on a later opening.
  function close() {
    if (change.isPending) return;
    setErrors({});
    change.reset();
    onClose();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("current_password") ?? "");
    const newPassword = String(form.get("new_password") ?? "");
    if (newPassword === currentPassword) {
      setErrors({
        new_password: formatMessage({
          id: "page.profile.password.same",
          defaultMessage: "The new password must be different from the current one.",
        }),
      });
      return;
    }
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
    change.mutate({ body: { current_password: currentPassword, new_password: newPassword } }, { onSuccess: close });
  }

  return (
    <Modal
      open={open}
      title={formatMessage({ id: "page.profile.password.title", defaultMessage: "Change password" })}
      onClose={close}
    >
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
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
          <Button type="button" variant="secondary" size="small" onClick={close} disabled={change.isPending}>
            {formatMessage({ id: "page.profile.password.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" disabled={change.isPending}>
            {formatMessage({ id: "page.profile.password.save", defaultMessage: "Change password" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
