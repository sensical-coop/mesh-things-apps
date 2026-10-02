import type { DeviceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormCheckbox } from "@/components/form/form-checkbox";
import { FormField } from "@/components/form/form-field";
import { FormNumber } from "@/components/form/form-number";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { formLevelMessage, readApiError } from "@/lib/api-errors";
import { deviceRepository } from "@/features/device/repository";
import { deviceTitle, parseCoordinate } from "@/features/device/model";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { useFormatters } from "@/hooks/use-formatters";

type IntervalSecondsFieldProps = {
  id: string;
  name: string;
  label: string;
  hint: string;
  defaultValue: number | null;
  error?: string;
};

function IntervalSecondsField({ id, name, label, hint, defaultValue, error }: IntervalSecondsFieldProps): ReactElement {
  const { formatSecondsAsHms } = useFormatters();
  const [seconds, setSeconds] = useState(defaultValue);
  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <FormNumber id={id} name={name} min={0} defaultValue={defaultValue ?? undefined} onValueChange={setSeconds} />
        </div>
        <p className="shrink-0 whitespace-nowrap text-caption-1-regular text-text-tertiary tabular-nums" aria-live="polite">
          {formatSecondsAsHms(seconds)}
        </p>
      </div>
    </FormField>
  );
}

export function DeviceSettingsDialog({
  device,
  open,
  onClose,
  onSaved,
}: {
  device: DeviceRead;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const update = useMutation({
    ...deviceRepository.update(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: deviceRepository.listKey() });
      await queryClient.invalidateQueries({
        queryKey: deviceRepository.retrieveKey({ path: { device_uuid: device.uuid } }),
      });
      await onSaved?.();
      onClose();
    },
    onError: (failure) => setFieldErrors(readApiError(failure).fields),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lat = parseCoordinate(String(form.get("latitude") ?? ""), 90);
    const lon = parseCoordinate(String(form.get("longitude") ?? ""), 180);
    const invalid = formatMessage({
      id: "feature.device.settingsDialog.coordinateInvalid",
      defaultMessage: "Enter decimal degrees, e.g. 41.3851.",
    });
    const coordinateErrors: Record<string, string> = {
      ...(lat.ok ? {} : { latitude: invalid }),
      ...(lon.ok ? {} : { longitude: invalid }),
    };
    if (!lat.ok || !lon.ok) {
      setError(null);
      setFieldErrors(coordinateErrors);
      return;
    }
    if ((lat.value === null) !== (lon.value === null)) {
      setFieldErrors({});
      setError(
        formatMessage({
          id: "feature.device.settingsDialog.latLonError",
          defaultMessage: "Latitude and longitude must be provided together.",
        }),
      );
      return;
    }
    setError(null);
    setFieldErrors({});
    update.mutate({
      path: { device_uuid: device.uuid },
      body: {
        is_allowed: form.get("is_allowed") === "on",
        is_gateway: form.get("is_gateway") === "on",
        absence_detection_enabled: form.get("absence_detection_enabled") === "on",
        reading_interval_seconds: Number(form.get("reading_interval_seconds")) || null,
        publish_interval_seconds: Number(form.get("publish_interval_seconds")) || null,
        latitude: lat.value,
        longitude: lon.value,
      },
    });
  }

  return (
    <Modal
      open={open}
      title={formatMessage(
        { id: "feature.device.settingsDialog.title", defaultMessage: "Edit settings — {name}" },
        { name: deviceTitle(device) },
      )}
      description={formatMessage({
        id: "feature.device.settingsDialog.description",
        defaultMessage: "Allowed, gateway, alarms, intervals, and coordinates. Blueprints are attached from the Postprocessing panel.",
      })}
      onClose={onClose}
    >
      <form key={`${device.uuid}-${open}`} className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
          <FormCheckbox
            id="device-allowed"
            name="is_allowed"
            label={formatMessage({ id: "feature.device.settingsDialog.allowed", defaultMessage: "Allowed" })}
            hint={formatMessage({
              id: "feature.device.settingsDialog.allowedHint",
              defaultMessage: "Only allowed devices have their packets decoded and stored. Disallow a device before moving it to another mesh.",
            })}
            defaultChecked={device.is_allowed}
          />
          <FormCheckbox
            id="device-gateway"
            name="is_gateway"
            label={formatMessage({
              id: "feature.device.settingsDialog.gateway",
              defaultMessage: "This device is a gateway",
            })}
            hint={formatMessage({
              id: "feature.device.settingsDialog.gatewayHint",
              defaultMessage: "Gateways relay the mesh's traffic to the broker. Plain nodes only report through a gateway.",
            })}
            defaultChecked={device.is_gateway}
          />
          <FormCheckbox
            id="device-alarms"
            name="absence_detection_enabled"
            label={formatMessage({
              id: "feature.device.settingsDialog.alarms",
              defaultMessage: "Enable absence detection",
            })}
            hint={formatMessage({
              id: "feature.device.settingsDialog.alarmsHint",
              defaultMessage:
                "Detects when this device stops publishing. Per-channel detectors can be configured independently.",
            })}
            defaultChecked={device.absence_detection_enabled}
          />
          <IntervalSecondsField
            id="device-reading"
            name="reading_interval_seconds"
            label={formatMessage({
              id: "feature.device.settingsDialog.readingInterval",
              defaultMessage: "Reading interval (s)",
            })}
            hint={formatMessage({
              id: "feature.device.settingsDialog.readingIntervalHint",
              defaultMessage: "How often the device samples its sensors. Used to spot gaps in a channel's history.",
            })}
            defaultValue={device.reading_interval_seconds}
            error={fieldErrors.reading_interval_seconds}
          />
          <IntervalSecondsField
            id="device-publish"
            name="publish_interval_seconds"
            label={formatMessage({
              id: "feature.device.settingsDialog.publishInterval",
              defaultMessage: "Publish interval (s)",
            })}
            hint={formatMessage({
              id: "feature.device.settingsDialog.publishIntervalHint",
              defaultMessage: "How often the device sends data to the mesh. Absence detection fires after several missed intervals.",
            })}
            defaultValue={device.publish_interval_seconds}
            error={fieldErrors.publish_interval_seconds}
          />
          <FormField
            id="device-lat"
            label={formatMessage({ id: "feature.device.settingsDialog.latitude", defaultMessage: "Latitude" })}
            hint={formatMessage({
              id: "feature.device.settingsDialog.latitudeHint",
              defaultMessage: "Decimal degrees, -90 to 90. Overrides the position the node reports. Leave both blank to use it.",
            })}
            error={fieldErrors.latitude}
          >
            <Input
              id="device-lat"
              name="latitude"
              inputMode="decimal"
              autoComplete="off"
              className="tabular-nums"
              aria-invalid={fieldErrors.latitude ? true : undefined}
              defaultValue={device.latitude ?? ""}
            />
          </FormField>
          <FormField
            id="device-lon"
            label={formatMessage({ id: "feature.device.settingsDialog.longitude", defaultMessage: "Longitude" })}
            hint={formatMessage({
              id: "feature.device.settingsDialog.longitudeHint",
              defaultMessage: "Decimal degrees, -180 to 180.",
            })}
            error={fieldErrors.longitude}
          >
            <Input
              id="device-lon"
              name="longitude"
              inputMode="decimal"
              autoComplete="off"
              className="tabular-nums"
              aria-invalid={fieldErrors.longitude ? true : undefined}
              defaultValue={device.longitude ?? ""}
            />
          </FormField>
        </FieldGroup>
        {error || update.error ? (
          <StatusCopy>
            {error ??
              formatMessage({
                id: "feature.device.settingsDialog.updateFailed",
                defaultMessage: "Update failed.",
              })}
            {!error && formLevelMessage(update.error) ? ` ${formLevelMessage(update.error)}` : ""}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.device.settingsDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" disabled={update.isPending}>
            {update.isPending
              ? formatMessage({ id: "feature.device.settingsDialog.saving", defaultMessage: "Saving" })
              : formatMessage({ id: "feature.device.settingsDialog.save", defaultMessage: "Save settings" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
