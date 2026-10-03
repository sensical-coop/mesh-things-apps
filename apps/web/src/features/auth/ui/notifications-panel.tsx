import { zOwnersMeUpdateData } from "@mtt/contracts/zod";
import { Checkbox } from "@mtt/ui/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@mtt/ui/components/ui/field";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { FormNumber } from "@/components/form/form-number";
import { SaveButton } from "@/components/form/save-button";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";
import { useMe } from "@/features/auth/use-me";
import { readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";

const SECONDS_PER_HOUR = 3600;
const MAX_ALARM_COOLDOWN_HOURS = 720; // matches the backend's 30-day (2592000s) cap

function secondsToHours(seconds: number | null | undefined): number | undefined {
  if (seconds == null) return undefined;
  return Math.round((seconds / SECONDS_PER_HOUR) * 100) / 100;
}

const sectionTitleClass = "text-body-medium text-text-primary";

/**
 * The profile's "Notifications" panel: how often alarm emails repeat, and, for
 * operators, whether to be emailed when one of their sources or sinks stops working.
 */
export function NotificationsPanel(): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const { me, isOperator } = useMe();
  const [error, setError] = useState<string | null>(null);
  const update = useMutation({
    ...authRepository.update(),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
    },
    onError: (failure) => {
      const fields = readApiError(failure).fields;
      setError(fields.alarm_email_cooldown_seconds ?? fields.status_alerts_enabled ?? null);
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const raw = String(form.get("alarm_cooldown_hours") ?? "").trim();
    const seconds = raw === "" ? null : Math.round(Number(raw) * SECONDS_PER_HOUR);
    const parsed = zOwnersMeUpdateData.safeParse({
      body: {
        alarm_email_cooldown_seconds: seconds,
        ...(isOperator ? { status_alerts_enabled: form.get("status_alerts_enabled") === "on" } : {}),
      },
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    setError(null);
    update.mutate({ body: parsed.data.body });
  }

  return (
    <Frame className="shadow-card">
      <FrameHeader>
        <FrameTitle>
          {formatMessage({ id: "page.profile.notifications.title", defaultMessage: "Notifications" })}
        </FrameTitle>
        <FrameDescription>
          {formatMessage({
            id: "page.profile.notifications.description",
            defaultMessage: "Choose which emails you get and how often.",
          })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        {!me ? (
          <SkeletonRows />
        ) : (
          <form key={me.id} className="flex flex-col gap-5" onSubmit={onSubmit}>
            <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
              <section className="flex flex-col gap-3">
                <h3 className={sectionTitleClass}>
                  {formatMessage({ id: "page.profile.alarms.title", defaultMessage: "Alarms" })}
                </h3>
                <FormField
                  id="profile-alarm-cooldown"
                  label={formatMessage({ id: "page.profile.alarmCooldown", defaultMessage: "Alarm email cooldown (hours)" })}
                  hint={formatMessage({
                    id: "page.profile.alarmCooldownHint",
                    defaultMessage: "Minimum time between quality-alarm emails. Leave empty to use the server default.",
                  })}
                >
                  <FormNumber
                    id="profile-alarm-cooldown"
                    name="alarm_cooldown_hours"
                    min={0}
                    max={MAX_ALARM_COOLDOWN_HOURS}
                    step="any"
                    defaultValue={secondsToHours(me.alarm_email_cooldown_seconds)}
                  />
                </FormField>
              </section>
              {isOperator ? (
                <section className="flex flex-col gap-3">
                  <h3 className={sectionTitleClass}>
                    {formatMessage({ id: "page.profile.statusAlerts.title", defaultMessage: "Status alerts" })}
                  </h3>
                  <Field orientation="horizontal">
                    <Checkbox
                      id="profile-status-alerts"
                      name="status_alerts_enabled"
                      defaultChecked={me.status_alerts_enabled}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="profile-status-alerts" className="text-body-regular text-text-primary">
                        {formatMessage({
                          id: "page.profile.statusAlerts.label",
                          defaultMessage: "Email me when a source or sink stops working",
                        })}
                      </FieldLabel>
                      <FieldDescription className="text-caption-1-regular text-text-tertiary">
                        {formatMessage({
                          id: "page.profile.statusAlerts.hint",
                          defaultMessage:
                            "Sent once when a source you created stays disconnected, or a sink with meshes or devices attached has nobody connected.",
                        })}
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                </section>
              ) : null}
            </div>
            {error ? <StatusCopy>{error}</StatusCopy> : null}
            {update.error && !error ? (
              <StatusCopy>
                {formatMessage({
                  id: "page.profile.error",
                  defaultMessage: "The profile was not saved. Check the fields and try again.",
                })}
              </StatusCopy>
            ) : null}
            <div className={dialogActionsClass}>
              <SaveButton pending={update.isPending} saved={update.isSuccess} savedKey={update.submittedAt} />
            </div>
          </form>
        )}
      </FramePanel>
    </Frame>
  );
}
