import type { DeviceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiNotificationLine, RiNotificationOffLine } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { deviceRepository, invalidateDevice } from "@/features/device/repository";

type DeviceAbsenceToggleProps = {
  device: DeviceRead;
};

// Directly toggles Device.absence_detection_enabled — fires only when this
// device stops publishing entirely. Per-channel detectors are unaffected
// and keep running either way, so this is a plain toggle, not a
// confirm-guarded bulk action.
export function DeviceAbsenceToggle({ device }: DeviceAbsenceToggleProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const update = useMutation(deviceRepository.update());

  function onClick() {
    update.mutate(
      {
        deviceUuid: device.uuid,
        data: { absence_detection_enabled: !device.absence_detection_enabled },
      },
      {
        onSuccess: () => invalidateDevice(queryClient, device),
      },
    );
  }

  return (
    <Button
      type="button"
      size="xs"
      variant="secondary"
      leadingIcon={device.absence_detection_enabled ? RiNotificationLine : RiNotificationOffLine}
      disabled={update.isPending}
      onClick={onClick}
    >
      {device.absence_detection_enabled
        ? formatMessage({ id: "page.alarms.list.alarmsEnabled", defaultMessage: "Absence detection on" })
        : formatMessage({ id: "page.alarms.list.alarmsDisabled", defaultMessage: "Absence detection off" })}
    </Button>
  );
}
