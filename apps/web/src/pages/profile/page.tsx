import { zOwnersMeUpdateData } from "@mtt/contracts/zod";
import { Button } from "@mtt/ui/components/base/buttons/button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { SaveButton } from "@/components/form/save-button";
import { pageHeadingClass } from "@/lib/page-heading";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { OperatorRolePanel } from "@/features/operator-request/ui/operator-role-panel";
import { AccountTermsPanel } from "@/features/terms/ui/account-terms-panel";
import { formLevelMessage, issueErrors, readApiError } from "@/lib/api-errors";
import { authRepository } from "@/features/auth/repository";
import { ApiKeyPanel } from "@/features/auth/ui/api-key-panel";
import { DeleteAccountDialog } from "@/features/auth/ui/delete-account-dialog";
import { NotificationsPanel } from "@/features/auth/ui/notifications-panel";
import { routes } from "@/router";

export function ProfilePage(): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery(authRepository.me());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const update = useMutation({
    ...authRepository.update(),
    onSuccess: async () => {
      setErrors({});
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
    },
    onError: (error) => setErrors(readApiError(error).fields),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = zOwnersMeUpdateData.safeParse({
      body: {
        name: String(form.get("name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
      },
    });
    if (!parsed.success) {
      setErrors(issueErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    update.mutate({ body: parsed.data.body });
  }

  return (
    <>
      <div className={pageHeadingClass}>
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
          {formatMessage({ id: "page.profile.title", defaultMessage: "Profile" })}
        </h1>
      </div>
      <div className="flex flex-col gap-6">
        <Frame className="shadow-card">
          <FrameHeader>
            <FrameTitle>{formatMessage({ id: "page.profile.panel.title", defaultMessage: "Account" })}</FrameTitle>
            <FrameDescription>
              {formatMessage({
                id: "page.profile.panel.description",
                defaultMessage: "Changing your email requires verifying the new address before you can sign back in.",
              })}
            </FrameDescription>
          </FrameHeader>
          <FramePanel>
            {me.isPending ? (
              <SkeletonRows />
            ) : (
              <form key={me.data?.id} className="flex flex-col gap-5" onSubmit={onSubmit}>
                <FieldGroup className="grid gap-x-8 gap-y-5 md:grid-cols-2">
                  <FormField
                    id="profile-name"
                    label={formatMessage({ id: "page.profile.name", defaultMessage: "Name" })}
                    error={errors.name}
                  >
                    <Input id="profile-name" name="name" required autoComplete="name" defaultValue={me.data?.name} />
                  </FormField>
                  <FormField
                    id="profile-email"
                    label={formatMessage({ id: "page.profile.email", defaultMessage: "Email" })}
                    hint={formatMessage({
                      id: "page.profile.emailHint",
                      defaultMessage: "A new email sends a fresh verification link and signs you out of the console until you confirm it.",
                    })}
                    error={errors.email}
                  >
                    <Input
                      id="profile-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      defaultValue={me.data?.email}
                    />
                  </FormField>
                </FieldGroup>
                {update.error ? (
                  <StatusCopy>
                    {formatMessage({
                      id: "page.profile.error",
                      defaultMessage: "The profile was not saved. Check the fields and try again.",
                    })}
                    {formLevelMessage(update.error) ? ` ${formLevelMessage(update.error)}` : ""}
                  </StatusCopy>
                ) : null}
                <div className={dialogActionsClass}>
                  <SaveButton pending={update.isPending} saved={update.isSuccess} savedKey={update.submittedAt} />
                </div>
              </form>
            )}
          </FramePanel>
        </Frame>
        <ApiKeyPanel />
        <AccountTermsPanel />
        <OperatorRolePanel />
        <NotificationsPanel />
        <Frame className="shadow-card [--frame-border-color:color-mix(in_oklch,var(--color-border-error-default)_35%,transparent)] [--frame-panel-bg:var(--color-background-tertiary-error)] [--frame-panel-border-color:color-mix(in_oklch,var(--color-border-error-default)_30%,transparent)]">
          <FrameHeader>
            <FrameTitle className="text-text-error-primary">{formatMessage({ id: "page.profile.dangerZone.title", defaultMessage: "Danger zone" })}</FrameTitle>
            <FrameDescription>
              {formatMessage({
                id: "page.profile.dangerZone.description",
                defaultMessage: "Delete your account and everything you own. This can't be undone.",
              })}
            </FrameDescription>
          </FrameHeader>
          <FramePanel>
            <Button type="button" variant="danger" size="small" onClick={() => setDeleteOpen(true)}>
              {formatMessage({ id: "page.profile.dangerZone.delete", defaultMessage: "Delete account" })}
            </Button>
          </FramePanel>
        </Frame>
      </div>
      <DeleteAccountDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => navigate({ to: routes.login, search: { accountDeleted: true } })}
      />
    </>
  );
}
