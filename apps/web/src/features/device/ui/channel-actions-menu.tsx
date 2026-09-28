import type { DeviceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mtt/ui/components/ui/dropdown-menu";
import { RiArchiveLine, RiBellLine, RiMoreLine } from "@remixicon/react";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { AlarmDetectorsDialog } from "@/features/alarm/ui/alarm-detectors-dialog";
import { ArchiveSettingsDialog } from "@/features/archive/ui/archive-settings-dialog";

export type ChannelActionsMenuProps = {
  device: DeviceRead;
  channel: string;
  label: string;
};

/**
 * A card's settings: the channel's alarms, and the archive of the whole device. For
 * those who may archive; everyone else gets the alarm bell alone.
 */
export function ChannelActionsMenu({ device, channel, label }: ChannelActionsMenuProps): ReactElement {
  const { formatMessage } = useIntl();
  const [dialog, setDialog] = useState<"alarms" | "archive" | null>(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="xs"
              variant="secondary"
              iconOnly
              leadingIcon={RiMoreLine}
              aria-label={formatMessage(
                { id: "feature.device.channelActions.label", defaultMessage: "Settings for {label}" },
                { label },
              )}
            />
          }
        />
        <DropdownMenuContent align="end" className="w-auto min-w-44">
          <DropdownMenuItem onClick={() => setDialog("alarms")}>
            <RiBellLine aria-hidden />
            {formatMessage({ id: "feature.device.channelActions.alarms", defaultMessage: "Alarms" })}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("archive")}>
            <RiArchiveLine aria-hidden />
            <span className="flex-1">
              {formatMessage({ id: "feature.device.channelActions.archive", defaultMessage: "S3 storage" })}
            </span>
            {device.archive_enabled ? (
              <span className="text-caption-1-regular text-accent-500">
                {formatMessage({ id: "feature.device.channelActions.archiveOn", defaultMessage: "On" })}
              </span>
            ) : null}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === "alarms" ? (
        <AlarmDetectorsDialog open onClose={() => setDialog(null)} deviceUuid={device.uuid} channel={channel} label={label} />
      ) : null}
      {dialog === "archive" ? <ArchiveSettingsDialog device={device} open onClose={() => setDialog(null)} /> : null}
    </>
  );
}
