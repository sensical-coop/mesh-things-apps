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
import { FormNumber } from "@/components/form/form-number";
import { pageHeadingClass } from "@/lib/page-heading";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";
import { DeleteAccountDialog } from "@/features/auth/ui/delete-account-dialog";
import { routes } from "@/router";

const SECONDS_PER_HOUR = 3600;
const MAX_ALARM_COOLDOWN_HOURS = 720; // matches the backend's 30-day (2592000s) cap

function secondsToHours(seconds: number | null | undefined): number | undefined {
  if (seconds == null) return undefined;
  return Math.round((seconds / SECONDS_PER_HOUR) * 100) / 100;
}

function AlarmCooldownField({ defaultValueSeconds }: { defaultValueSeconds: number | null }): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <FormField
      id="profile-alarm-cooldown"
      label={formatMessage({ id: "page.profile.alarmCooldown", defaultMessage: "Alarm email cooldown (hours)" })}
      hint={formatMessage({
        id: "page.profile.alarmCooldownHint",
        defaultMessage:
          "Minimum time between quality-alarm emails. Leave empty to use the server default.",
      })}
    >
      <FormNumber
        id="profile-alarm-cooldown"
        name="alarm_cooldown_hours"
        min={0}
        max={MAX_ALARM_COOLDOWN_HOURS}
        step="any"
        defaultValue={secondsToHours(defaultValueSeconds)}
      />
    </FormField>
  );
}

export function ProfilePage(): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery(authRepository.me());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cooldownError, setCooldownError] = useState<string | null>(null);
  const update = useMutation({
    ...authRepository.update(),
    onSuccess: async () => {
      setErrors({});
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
    },
  });
  const updateCooldown = useMutation({
    ...authRepository.update(),
    onSuccess: async () => {
      setCooldownError(null);
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
    },
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
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path.at(-1) ?? "form");
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    update.mutate({ body: parsed.data.body });
  }

  function onCooldownSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const raw = String(form.get("alarm_cooldown_hours") ?? "").trim();
    const seconds = raw === "" ? null : Math.round(Number(raw) * SECONDS_PER_HOUR);
    const parsed = zOwnersMeUpdateData.safeParse({
      body: { alarm_email_cooldown_seconds: seconds },
    });
    if (!parsed.success) {
      setCooldownError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    setCooldownError(null);
    updateCooldown.mutate({ body: parsed.data.body });
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
              <form key={me.data?.id} className="flex max-w-md flex-col gap-5" onSubmit={onSubmit}>
                <FieldGroup>
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
                {update.isSuccess ? (
                  <StatusCopy>
                    {formatMessage({
                      id: "page.profile.saved",
                      defaultMessage: "Saved.",
                    })}
                  </StatusCopy>
                ) : null}
                {update.error ? (
                  <StatusCopy>
                    {formatMessage({
                      id: "page.profile.error",
                      defaultMessage: "The profile was not saved. Check the fields and try again.",
                    })}
                  </StatusCopy>
                ) : null}
                <div className={dialogActionsClass}>
                  <Button type="submit" size="small" disabled={update.isPending}>
                    {update.isPending
                      ? formatMessage({ id: "page.profile.saving", defaultMessage: "Saving" })
                      : formatMessage({ id: "page.profile.save", defaultMessage: "Save changes" })}
                  </Button>
                </div>
              </form>
            )}
          </FramePanel>
        </Frame>
        <Frame className="shadow-card">
          <FrameHeader>
            <FrameTitle>{formatMessage({ id: "page.profile.alarms.title", defaultMessage: "Alarms" })}</FrameTitle>
            <FrameDescription>
              {formatMessage({
                id: "page.profile.alarms.description",
                defaultMessage: "Control how often you're notified about a repeating alarm.",
              })}
            </FrameDescription>
          </FrameHeader>
          <FramePanel>
            {me.isPending ? (
              <SkeletonRows />
            ) : (
              <form key={me.data?.id} className="flex max-w-md flex-col gap-5" onSubmit={onCooldownSubmit}>
                <FieldGroup>
                  <AlarmCooldownField defaultValueSeconds={me.data?.alarm_email_cooldown_seconds ?? null} />
                </FieldGroup>
                {cooldownError ? <StatusCopy>{cooldownError}</StatusCopy> : null}
                {updateCooldown.isSuccess ? (
                  <StatusCopy>{formatMessage({ id: "page.profile.saved", defaultMessage: "Saved." })}</StatusCopy>
                ) : null}
                {updateCooldown.error ? (
                  <StatusCopy>
                    {formatMessage({
                      id: "page.profile.error",
                      defaultMessage: "The profile was not saved. Check the fields and try again.",
                    })}
                  </StatusCopy>
                ) : null}
                <div className={dialogActionsClass}>
                  <Button type="submit" size="small" disabled={updateCooldown.isPending}>
                    {updateCooldown.isPending
                      ? formatMessage({ id: "page.profile.saving", defaultMessage: "Saving" })
                      : formatMessage({ id: "page.profile.save", defaultMessage: "Save changes" })}
                  </Button>
                </div>
              </form>
            )}
          </FramePanel>
        </Frame>
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
