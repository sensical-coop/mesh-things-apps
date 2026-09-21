import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiBellLine } from "@remixicon/react";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { AlarmDetectorsDialog } from "@/features/alarm/ui/alarm-detectors-dialog";

export function AlarmBellButton({
  deviceUuid,
  channel,
  label,
  className,
}: {
  deviceUuid: string;
  channel: string;
  label: string;
  className?: string;
}): ReactElement {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="xs"
        variant="secondary"
        iconOnly
        leadingIcon={RiBellLine}
        className={className}
        aria-label={formatMessage({ id: "feature.alarm.bellButton.label", defaultMessage: "Alarms for {label}" }, { label })}
        onClick={() => setOpen(true)}
      />
      {open ? (
        <AlarmDetectorsDialog
          open={open}
          onClose={() => setOpen(false)}
          deviceUuid={deviceUuid}
          channel={channel}
          label={label}
        />
      ) : null}
    </>
  );
}
