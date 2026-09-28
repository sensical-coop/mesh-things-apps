import type { DeviceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { cx } from "@mtt/ui/utils";
import { RiArchiveFill, RiArchiveLine } from "@remixicon/react";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { deviceTitle } from "@/features/device/model";
import { ArchiveSettingsDialog } from "@/features/archive/ui/archive-settings-dialog";

export type ArchiveButtonProps = {
  device: DeviceRead;
  className?: string;
};

/** Opens the device's archive setting. Filled, in the accent, while the device is archived. */
export function ArchiveButton({ device, className }: ArchiveButtonProps): ReactElement {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);
  const archived = device.archive_enabled === true;
  const label = archived
    ? formatMessage(
        { id: "feature.archive.button.labelOn", defaultMessage: "S3 storage for {device}: on" },
        { device: deviceTitle(device) },
      )
    : formatMessage(
        { id: "feature.archive.button.labelOff", defaultMessage: "S3 storage for {device}: off" },
        { device: deviceTitle(device) },
      );
  return (
    <>
      <Button
        type="button"
        size="xs"
        variant="secondary"
        iconOnly
        leadingIcon={archived ? RiArchiveFill : RiArchiveLine}
        className={cx(archived && "text-accent-500", className)}
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      />
      {open ? <ArchiveSettingsDialog device={device} open onClose={() => setOpen(false)} /> : null}
    </>
  );
}
