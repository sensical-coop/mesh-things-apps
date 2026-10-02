import type { Algorithm, BlueprintVersion, DevicePostprocessing } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { RiDeleteBinLine } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { FormSelect } from "@/components/form/form-select";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { calibrationParams, errorMessages, formatParam, parseParam, valueMap } from "@/features/blueprint/model";
import { calibratedSteps, calibrationInForce, localInputToIso } from "@/features/postprocessing/model";
import { postprocessingRepository } from "@/features/postprocessing/repository";
import { useFormatters } from "@/hooks/use-formatters";
import { readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";

export type CalibrationDialogProps = {
  deviceUuid: string;
  postprocessing: DevicePostprocessing;
  version: Pick<BlueprintVersion, "steps">;
  algorithms: readonly Algorithm[];
  canEdit: boolean;
  onClose: () => void;
};

/**
 * This device's own sensor constants per step. History is kept: a new calibration applies from its
 * start, and readings taken before keep the one in force then.
 */
export function CalibrationDialog({
  deviceUuid,
  postprocessing,
  version,
  algorithms,
  canEdit,
  onClose,
}: CalibrationDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const queryClient = useQueryClient();
  const path = { device_uuid: deviceUuid, postprocessing_id: postprocessing.id };
  const history = useQuery(postprocessingRepository.calibrations({ path }));
  const steps = calibratedSteps(version, algorithms);
  const [stepKey, setStepKey] = useState(steps[0]?.key ?? "");
  const step = steps.find((row) => row.key === stepKey);
  const inForce = calibrationInForce(history.data ?? [], stepKey);
  const [messages, setMessages] = useState<string[]>([]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: postprocessingRepository.calibrationsKey({ path }) });
    await queryClient.invalidateQueries({ queryKey: postprocessingRepository.listKey({ path: { device_uuid: deviceUuid } }) });
  }

  const calibrate = useMutation({
    ...postprocessingRepository.calibrate(),
    onSuccess: async () => {
      setMessages([]);
      await refresh();
    },
    onError: (error) => setMessages(errorMessages(error)),
  });
  const remove = useMutation({
    ...postprocessingRepository.removeCalibration(),
    onSuccess: refresh,
    onError: (error) =>
      setMessages(
        readApiError(error).status === 409
          ? [
              formatMessage({
                id: "feature.postprocessing.calibration.removeRefused",
                defaultMessage: "Performing this action would leave a running postprocessing uncalibrated. Stop it first, or record a new calibration.",
              }),
            ]
          : errorMessages(error),
      ),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!step) return;
    const form = new FormData(event.currentTarget);
    const params: Record<string, unknown> = {};
    for (const param of calibrationParams(step.algorithm)) {
      const text = String(form.get(param.name) ?? "").trim();
      if (text) params[param.name] = parseParam(text);
    }
    calibrate.mutate({
      path,
      body: { step_key: step.key, params, valid_from: localInputToIso(String(form.get("valid_from") ?? "")) },
    });
  }

  return (
    <Modal
      open
      title={formatMessage(
        { id: "feature.postprocessing.calibration.title", defaultMessage: "Calibration — {name}" },
        { name: postprocessing.blueprint_name },
      )}
      description={formatMessage({
        id: "feature.postprocessing.calibration.description",
        defaultMessage:
          "Calibrations for this device. A new calibration applies from its start date; earlier readings keep the one in force when they were taken.",
      })}
      onClose={onClose}
    >
      <div className="flex flex-col gap-6">
        {canEdit && step ? (
          <form key={`${stepKey}-${inForce?.id ?? "none"}`} className="flex flex-col gap-5" onSubmit={onSubmit}>
            <FieldGroup>
              {steps.length > 1 ? (
                <FormField id="calibration-step" label={formatMessage({ id: "feature.postprocessing.calibration.step", defaultMessage: "Step" })}>
                  <FormSelect
                    id="calibration-step"
                    name="step_key"
                    value={stepKey}
                    items={steps.map((row) => ({ value: row.key, label: `${row.key} · ${row.algorithm.name}` }))}
                    onValueChange={setStepKey}
                  />
                </FormField>
              ) : null}
              {calibrationParams(step.algorithm).map((param) => (
                <FormField
                  key={param.name}
                  id={`calibration-${param.name}`}
                  label={param.unit ? `${param.name} (${param.unit})` : param.name}
                  hint={param.doc || undefined}
                >
                  <Input
                    id={`calibration-${param.name}`}
                    name={param.name}
                    required={param.required}
                    autoComplete="off"
                    inputMode={param.default === null || typeof param.default === "number" ? "decimal" : undefined}
                    // Start from the calibration in force, so recalibrating one constant keeps the others.
                    defaultValue={inForce && param.name in valueMap(inForce.params) ? formatParam(valueMap(inForce.params)[param.name]) : ""}
                    placeholder={
                      param.required
                        ? formatMessage({ id: "feature.blueprint.step.paramRequired", defaultMessage: "Required" })
                        : formatMessage(
                            { id: "feature.blueprint.step.paramDefault", defaultMessage: "Default {value}" },
                            { value: JSON.stringify(param.default) },
                          )
                    }
                  />
                </FormField>
              ))}
              <FormField
                id="calibration-valid-from"
                label={formatMessage({ id: "feature.postprocessing.calibration.validFrom", defaultMessage: "Applies from" })}
                hint={formatMessage({
                  id: "feature.postprocessing.calibration.validFromHint",
                  defaultMessage: "Blank: now. Backfill afterwards to recompute stored readings.",
                })}
              >
                <Input id="calibration-valid-from" name="valid_from" type="datetime-local" />
              </FormField>
            </FieldGroup>
            <div className={dialogActionsClass}>
              <Button type="submit" size="small" disabled={calibrate.isPending}>
                {calibrate.isPending
                  ? formatMessage({ id: "feature.postprocessing.calibration.saving", defaultMessage: "Saving" })
                  : formatMessage({ id: "feature.postprocessing.calibration.save", defaultMessage: "Record calibration" })}
              </Button>
            </div>
          </form>
        ) : null}
        {steps.length === 0 ? (
          <StatusCopy>
            {formatMessage({
              id: "feature.postprocessing.calibration.none",
              defaultMessage: "No step of this version takes a calibration.",
            })}
          </StatusCopy>
        ) : null}
        {messages.length ? (
          <ul className="flex flex-col gap-1" role="status">
            {messages.map((message) => (
              <li key={message} className="text-body-regular text-text-secondary">
                {message}
              </li>
            ))}
          </ul>
        ) : null}
        <section className="flex flex-col gap-2">
          <h3 className="text-caption-1-medium text-text-secondary">
            {formatMessage({ id: "feature.postprocessing.calibration.history", defaultMessage: "History" })}
          </h3>
          {history.data?.length ? (
            <ul className="flex flex-col gap-2">
              {[...history.data].reverse().map((row) => {
                const current = calibrationInForce(history.data, row.step_key)?.id === row.id;
                return (
                  <li key={row.id} className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="min-w-0 break-words text-body-regular text-text-primary">
                        <span className="font-mono">{row.step_key}</span>
                        <span className="text-text-tertiary"> · </span>
                        {formatMessage(
                          { id: "feature.postprocessing.calibration.from", defaultMessage: "from {when}" },
                          { when: formatWhen(row.valid_from ?? row.created_at) },
                        )}
                        {current ? (
                          <span className="text-text-tertiary">
                            {" · "}
                            {formatMessage({ id: "feature.postprocessing.calibration.current", defaultMessage: "in force" })}
                          </span>
                        ) : null}
                      </p>
                      <p className="min-w-0 break-words font-mono text-caption-1-regular text-text-tertiary">
                        {Object.entries(valueMap(row.params))
                          .map(([name, value]) => `${name}=${formatParam(value)}`)
                          .join("  ")}
                      </p>
                    </div>
                    {canEdit ? (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        iconOnly
                        leadingIcon={RiDeleteBinLine}
                        disabled={remove.isPending}
                        aria-label={formatMessage({
                          id: "feature.postprocessing.calibration.remove",
                          defaultMessage: "Remove this calibration",
                        })}
                        onClick={() => remove.mutate({ path: { ...path, calibration_id: row.id } })}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-body-regular text-text-tertiary">
              {history.isPending
                ? formatMessage({ id: "feature.postprocessing.calibration.loading", defaultMessage: "Loading…" })
                : formatMessage({ id: "feature.postprocessing.calibration.empty", defaultMessage: "Not calibrated yet." })}
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
