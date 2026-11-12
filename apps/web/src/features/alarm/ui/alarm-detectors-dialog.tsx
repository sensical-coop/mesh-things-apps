import { DetectorEnum } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormCheckbox } from "@mtt/ui/forms/form-checkbox";
import { FormField } from "@mtt/ui/forms/form-field";
import { FormNumber } from "@mtt/ui/forms/form-number";
import { Modal } from "@/components/modal";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { formLevelMessage, readApiError } from "@mtt/contracts/errors";
import { dialogActionsClass } from "@mtt/ui/forms/dialog-actions";
import { alarmRepository } from "@/features/alarm/repository";
import { deviceRepository } from "@/features/device/repository";

const DETECTOR_LABEL_IDS: Record<string, { id: string; defaultMessage: string }> = {
  flat_value: { id: "feature.alarm.detectorsDialog.detector.flatValue", defaultMessage: "Flat value" },
  range: { id: "feature.alarm.detectorsDialog.detector.range", defaultMessage: "Range" },
  completeness: { id: "feature.alarm.detectorsDialog.detector.completeness", defaultMessage: "Completeness" },
};

export function AlarmDetectorsDialog({
  onClose,
  deviceUuid,
  channel,
  label,
}: {
  onClose: () => void;
  deviceUuid: string;
  channel: string;
  label: string;
}): ReactElement {
  const { formatMessage, locale } = useIntl();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const updateMeasurement = useMutation(deviceRepository.measurementUpdate());

  const device = useQuery(deviceRepository.retrieve(deviceUuid));
  const measurements = useQuery(deviceRepository.measurements(deviceUuid));
  const row = measurements.data?.find((m) => m.measurement_type.channel === channel);
  const variants = useQuery(deviceRepository.telemetryVariants(deviceUuid));
  const variant = variants.data?.find((v) => v.telemetry_variant.id === row?.telemetry_variant_id);
  const detectorsQuery = useQuery(alarmRepository.detectors());
  const measurementDetectors = (detectorsQuery.data ?? []).filter((d) => d.scope === "measurement");

  const loading = measurements.isPending || detectorsQuery.isPending || device.isPending;
  const effective = new Set(row?.effective_detectors ?? []);
  const readingInterval = device.data?.reading_interval_seconds ?? variant?.telemetry_variant.default_reading_interval_seconds ?? null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row) return;
    const form = new FormData(event.currentTarget);
    const enabledDetectors = measurementDetectors.flatMap((d) => {
      const name = DetectorEnum.safeParse(d.name);
      return name.success && form.get(`detector-${d.name}`) === "on" ? [name.data] : [];
    });
    const min = String(form.get("valid_min") ?? "").trim();
    const max = String(form.get("valid_max") ?? "").trim();
    if ((min === "") !== (max === "")) {
      setError(
        formatMessage({
          id: "feature.alarm.detectorsDialog.rangePairError",
          defaultMessage: "Min and max must be set or cleared together.",
        }),
      );
      return;
    }
    setError(null);
    setFieldErrors({});
    try {
      await updateMeasurement.mutateAsync({ deviceUuid, measurementId: row.id, data: {
          enabled_detectors: enabledDetectors,
          valid_min: min === "" ? null : Number(min),
          valid_max: max === "" ? null : Number(max),
        } });
      await queryClient.invalidateQueries({ queryKey: deviceRepository.measurementsKey(deviceUuid) });
      onClose();
    } catch (failure) {
      const { fields } = readApiError(failure);
      setFieldErrors(fields);
      const extra = fields.enabled_detectors ?? formLevelMessage(failure);
      setError(
        formatMessage({
          id: "feature.alarm.detectorsDialog.error",
          defaultMessage: "The alarm settings were not saved. Try again.",
        }) + (extra ? ` ${extra}` : ""),
      );
    }
  }

  return (
    <Modal
      open
      title={formatMessage(
        { id: "feature.alarm.detectorsDialog.title", defaultMessage: "Alarms — {label}" },
        { label },
      )}
      description={formatMessage({
        id: "feature.alarm.detectorsDialog.description",
        defaultMessage: "Choose which detectors watch this channel and trigger an alarm.",
      })}
      onClose={onClose}
    >
      <p className="mb-4 text-caption-1-regular text-text-tertiary">
        {formatMessage({
          id: "feature.alarm.detectorsDialog.independenceNote",
          defaultMessage:
            "These run regardless of the device's own \"Enable absence detection\" setting, which only covers the device being silent.",
        })}
      </p>
      {loading ? <SkeletonRows rows={3} /> : null}
      {!loading && !row ? (
        <StatusCopy>
          {formatMessage({
            id: "feature.alarm.detectorsDialog.notFound",
            defaultMessage: "This channel isn't reporting for this device yet.",
          })}
        </StatusCopy>
      ) : null}
      {!loading && row ? (
        <form key={row.id} className="flex flex-col gap-5" onSubmit={onSubmit}>
          <FieldGroup>
            {measurementDetectors.map((detector) => {
              const labelIds = DETECTOR_LABEL_IDS[detector.name];
              return (
                <div key={detector.name} className="flex flex-col gap-2">
                  <FormCheckbox
                    id={`detector-${detector.name}`}
                    name={`detector-${detector.name}`}
                    label={labelIds ? formatMessage(labelIds) : detector.name}
                    defaultChecked={effective.has(detector.name)}
                  />
                  <p className="pl-7 text-caption-1-regular text-text-secondary">{detector.description}</p>
                  {detector.name === "range" ? (
                    <div className="ml-7 flex flex-wrap items-end gap-3">
                      <FormField
                        id="detector-valid-min"
                        label={formatMessage({
                          id: "feature.alarm.detectorsDialog.validMin",
                          defaultMessage: "Min",
                        })}
                        error={fieldErrors.valid_min}
                      >
                        <FormNumber locale={locale}
                          id="detector-valid-min"
                          name="valid_min"
                          step="any"
                          defaultValue={row.valid_min ?? undefined}
                        />
                      </FormField>
                      <FormField
                        id="detector-valid-max"
                        label={formatMessage({
                          id: "feature.alarm.detectorsDialog.validMax",
                          defaultMessage: "Max",
                        })}
                        error={fieldErrors.valid_max}
                      >
                        <FormNumber locale={locale}
                          id="detector-valid-max"
                          name="valid_max"
                          step="any"
                          defaultValue={row.valid_max ?? undefined}
                        />
                      </FormField>
                    </div>
                  ) : null}
                  {detector.name === "completeness" ? (
                    <p className="pl-7 text-caption-1-regular text-text-tertiary">
                      {readingInterval != null
                        ? formatMessage(
                            {
                              id: "feature.alarm.detectorsDialog.readingIntervalHint",
                              defaultMessage: "Uses this device's reading interval: {seconds}s.",
                            },
                            { seconds: readingInterval },
                          )
                        : formatMessage({
                            id: "feature.alarm.detectorsDialog.noReadingInterval",
                            defaultMessage: "No reading interval configured yet.",
                          })}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </FieldGroup>
          {error ? <StatusCopy>{error}</StatusCopy> : null}
          <div className={dialogActionsClass}>
            <Button type="button" variant="secondary" size="small" onClick={onClose}>
              {formatMessage({ id: "feature.alarm.detectorsDialog.cancel", defaultMessage: "Cancel" })}
            </Button>
            <Button type="submit" size="small" disabled={updateMeasurement.isPending}>
              {updateMeasurement.isPending
                ? formatMessage({ id: "feature.alarm.detectorsDialog.saving", defaultMessage: "Saving" })
                : formatMessage({ id: "feature.alarm.detectorsDialog.save", defaultMessage: "Save alarms" })}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
