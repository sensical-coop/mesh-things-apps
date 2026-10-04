import type { DeviceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiFileDownloadLine } from "@remixicon/react";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { DeviceCsvDialog } from "@/features/export/ui/device-csv-dialog";

export type DeviceCsvButtonProps = {
  device: DeviceRead;
  className?: string;
};

/** On a device's page only: in a table a button per row would crowd it. */
export function DeviceCsvButton({ device, className }: DeviceCsvButtonProps): ReactElement {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="small"
        variant="secondary"
        leadingIcon={RiFileDownloadLine}
        className={className}
        onClick={() => setOpen(true)}
      >
        {formatMessage({ id: "feature.export.device.button", defaultMessage: "Download CSV" })}
      </Button>
      {open ? <DeviceCsvDialog device={device} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
