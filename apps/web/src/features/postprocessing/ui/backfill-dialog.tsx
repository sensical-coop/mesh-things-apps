import type { DevicePostprocessing } from "@mtt/contracts";
import { Chip } from "@mtt/ui/components/base/badges/chip";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormCheckbox } from "@/components/form/form-checkbox";
import { FormField } from "@/components/form/form-field";
import { Modal } from "@/components/modal";
import { errorMessages } from "@/features/blueprint/model";
import { localInputToIso } from "@/features/postprocessing/model";
import { postprocessingRepository } from "@/features/postprocessing/repository";
import { useFormatters } from "@/hooks/use-formatters";
import { dialogActionsClass } from "@/lib/dialog-actions";

export type BackfillDialogProps = {
  deviceUuid: string;
  postprocessing: DevicePostprocessing;
  canEdit: boolean;
  onClose: () => void;
};

const STATUS_COLOR = { pending: "neutral", running: "blue", done: "lime", failed: "rose" } as const;

/** Recompute stored history: a new postprocessing or a corrected calibration only affects live readings. */
export function BackfillDialog({ deviceUuid, postprocessing, canEdit, onClose }: BackfillDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const queryClient = useQueryClient();
  const path = { device_uuid: deviceUuid, postprocessing_id: postprocessing.id };
  const backfills = useQuery({
    ...postprocessingRepository.backfills({ path }),
    // Keep an eye on the worker while something is queued or running.
    refetchInterval: (query) =>
      query.state.data?.some((row) => row.status === "pending" || row.status === "running") ? 5000 : false,
  });
  const [messages, setMessages] = useState<string[]>([]);
  const request = useMutation({
    ...postprocessingRepository.backfill(),
    onSuccess: async () => {
      setMessages([]);
      await queryClient.invalidateQueries({ queryKey: postprocessingRepository.backfillsKey({ path }) });
    },
    onError: (error) => setMessages(errorMessages(error)),
  });
  const statusLabel = {
    pending: formatMessage({ id: "feature.postprocessing.backfill.pending", defaultMessage: "Queued" }),
    running: formatMessage({ id: "feature.postprocessing.backfill.running", defaultMessage: "Running" }),
    done: formatMessage({ id: "feature.postprocessing.backfill.done", defaultMessage: "Done" }),
    failed: formatMessage({ id: "feature.postprocessing.backfill.failed", defaultMessage: "Failed" }),
  };

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const start = localInputToIso(String(form.get("start") ?? ""));
    if (!start) return;
    request.mutate({
      path,
      body: {
        start,
        stop: localInputToIso(String(form.get("stop") ?? "")),
        include_dependants: form.get("include_dependants") === "on",
      },
    });
  }

  return (
    <Modal
      open
      title={formatMessage(
        { id: "feature.postprocessing.backfill.title", defaultMessage: "Recompute history — {name}" },
        { name: postprocessing.blueprint_name },
      )}
      description={formatMessage({
        id: "feature.postprocessing.backfill.description",
        defaultMessage:
          "Recomputes outputs for stored readings, using the calibration data stored (if any) for each period. This will replace derived outputs, up to 90 days per request. Backfilled values do not raise alarms.",
      })}
      onClose={onClose}
    >
      <div className="flex flex-col gap-6">
        {canEdit ? (
          <form className="flex flex-col gap-5" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="backfill-start" label={formatMessage({ id: "feature.postprocessing.backfill.start", defaultMessage: "From" })}>
                  <Input id="backfill-start" name="start" type="datetime-local" required />
                </FormField>
                <FormField
                  id="backfill-stop"
                  label={formatMessage({ id: "feature.postprocessing.backfill.stop", defaultMessage: "Until" })}
                  hint={formatMessage({ id: "feature.postprocessing.backfill.stopHint", defaultMessage: "Blank: now." })}
                >
                  <Input id="backfill-stop" name="stop" type="datetime-local" />
                </FormField>
              </div>
              <FormCheckbox
                id="backfill-dependants"
                name="include_dependants"
                label={formatMessage({
                  id: "feature.postprocessing.backfill.dependants",
                  defaultMessage: "Also recompute metrics that use the outputs of this one.",
                })}
              />
            </FieldGroup>
            {messages.length ? (
              <ul className="flex flex-col gap-1" role="status">
                {messages.map((message) => (
                  <li key={message} className="text-body-regular text-text-secondary">
                    {message}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className={dialogActionsClass}>
              <Button type="submit" size="small" disabled={request.isPending}>
                {formatMessage({ id: "feature.postprocessing.backfill.request", defaultMessage: "Recompute" })}
              </Button>
            </div>
          </form>
        ) : null}
        <section className="flex flex-col gap-2">
          <h3 className="text-caption-1-medium text-text-secondary">
            {formatMessage({ id: "feature.postprocessing.backfill.requests", defaultMessage: "Requests" })}
          </h3>
          {backfills.data?.length ? (
            <ul className="flex flex-col gap-2">
              {backfills.data.map((row) => (
                <li key={row.id} className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-body-regular text-text-primary">
                    <Chip variant="caption" color={STATUS_COLOR[row.status]} className="rounded-full">
                      {statusLabel[row.status]}
                    </Chip>
                    <span className="min-w-0 break-words">
                      {formatWhen(row.start)} → {row.stop ? formatWhen(row.stop) : "—"}
                    </span>
                  </div>
                  <p className="text-caption-1-regular text-text-tertiary">
                    {formatMessage(
                      { id: "feature.postprocessing.backfill.points", defaultMessage: "{count, plural, one {# value} other {# values}} written" },
                      { count: row.points_published },
                    )}
                    {row.error ? ` · ${row.error}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-regular text-text-tertiary">
              {formatMessage({ id: "feature.postprocessing.backfill.none", defaultMessage: "None yet." })}
            </p>
          )}
        </section>
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.postprocessing.calibration.close", defaultMessage: "Close" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
