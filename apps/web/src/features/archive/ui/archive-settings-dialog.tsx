import type { DeviceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormCheckbox } from "@/components/form/form-checkbox";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { formLevelMessage, readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { useFormatters } from "@/hooks/use-formatters";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { archiveRepository } from "@/features/archive/repository";
import { deviceRepository } from "@/features/device/repository";
import { deviceTitle } from "@/features/device/model";
import { meshRepository } from "@/features/mesh/repository";

export type ArchiveSettingsDialogProps = {
  device: DeviceRead;
  open: boolean;
  onClose: () => void;
};

/** Whether one device's readings go to the Parquet archive. The API has no other archive setting. */
export function ArchiveSettingsDialog({ device, open, onClose }: ArchiveSettingsDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const { ownerName } = useOwnerDirectory();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const update = useMutation({
    ...deviceRepository.update(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: deviceRepository.listKey() }),
        queryClient.invalidateQueries({ queryKey: deviceRepository.retrieveKey({ path: { device_uuid: device.uuid } }) }),
        queryClient.invalidateQueries({ queryKey: meshRepository.devicesKey({ path: { mesh_id: device.mesh_id } }) }),
        queryClient.invalidateQueries({ queryKey: archiveRepository.manifestKey({ path: { mesh_id: device.mesh_id } }) }),
      ]);
      onClose();
    },
    onError: (failure) => {
      const reason = readApiError(failure).fields.archive_enabled ?? formLevelMessage(failure);
      setError(
        formatMessage({
          id: "feature.archive.settingsDialog.error",
          defaultMessage: "The S3 storage setting was not saved.",
        }) + (reason ? ` ${reason}` : ""),
      );
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const enabled = new FormData(event.currentTarget).get("archive_enabled") === "on";
    if (enabled === device.archive_enabled) {
      onClose();
      return;
    }
    setError(null);
    update.mutate({ path: { device_uuid: device.uuid }, body: { archive_enabled: enabled } });
  }

  return (
    <Modal
      open={open}
      title={formatMessage(
        { id: "feature.archive.settingsDialog.title", defaultMessage: "S3 storage — {device}" },
        { device: deviceTitle(device) },
      )}
      description={formatMessage({
        id: "feature.archive.settingsDialog.description",
        defaultMessage:
          "Keep this device's readings in S3 as hourly Parquet files you can download or query from the Archive page.",
      })}
      onClose={onClose}
    >
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <div className="flex flex-col gap-2">
          <FormCheckbox
            id={`archive-${device.uuid}`}
            name="archive_enabled"
            label={formatMessage({
              id: "feature.archive.settingsDialog.enable",
              defaultMessage: "Store this device's readings in the Archive",
            })}
            defaultChecked={device.archive_enabled === true}
          />
          <p className="pl-7 text-caption-1-regular text-text-secondary">
            {formatMessage({
              id: "feature.archive.settingsDialog.enableHint",
              defaultMessage:
                "From now on, its decoded and derived readings are stored. Turning it off stops storing new ones, but keeps already stored data.",
            })}
          </p>
          {device.archive_enabled && device.archive_enabled_at ? (
            <p className="pl-7 text-caption-1-regular text-text-tertiary">
              {device.archive_enabled_by
                ? formatMessage(
                    {
                      id: "feature.archive.settingsDialog.enabledBy",
                      defaultMessage: "Stored since {when}, switched on by {name}.",
                    },
                    { when: formatWhen(device.archive_enabled_at), name: ownerName(device.archive_enabled_by) },
                  )
                : formatMessage(
                    { id: "feature.archive.settingsDialog.enabledAt", defaultMessage: "Stored since {when}." },
                    { when: formatWhen(device.archive_enabled_at) },
                  )}
            </p>
          ) : null}
        </div>
        <p className="text-caption-1-regular text-text-tertiary">
          {formatMessage({
            id: "feature.archive.settingsDialog.terms",
            defaultMessage:
              "Store only the devices you need, and only while you need them.",
          })}
        </p>
        {error ? <StatusCopy>{error}</StatusCopy> : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.archive.settingsDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" disabled={update.isPending}>
            {update.isPending
              ? formatMessage({ id: "feature.archive.settingsDialog.saving", defaultMessage: "Saving" })
              : formatMessage({ id: "feature.archive.settingsDialog.save", defaultMessage: "Save" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
