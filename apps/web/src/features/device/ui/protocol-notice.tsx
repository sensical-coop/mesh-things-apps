import type { DeviceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { WarningBanner } from "@/components/warning-banner";
import { deviceProtocolMismatch } from "../model";

export type DeviceProtocolNoticeProps = {
  device: Pick<DeviceRead, "protocol" | "observed_protocol" | "firmware_protocol" | "protocol_mismatch">;
  /** Only someone who can edit the mesh gets the button. */
  onChangeMesh?: () => void;
};

/** On the device page while its readings are lost or misread under its mesh's protocol. */
export function DeviceProtocolNotice({ device, onChangeMesh }: DeviceProtocolNoticeProps): ReactElement | null {
  const { formatMessage } = useIntl();
  const mismatch = deviceProtocolMismatch(device);
  if (!mismatch) return null;
  const message = {
    unsupported: formatMessage(
      {
        id: "feature.device.protocolNotice.unsupported",
        defaultMessage:
          "This device runs a Meshtastic version newer than any this instance decodes, so some of its readings are lost. Its mesh is on Meshtastic {protocol}.",
      },
      { protocol: device.protocol },
    ),
    ahead: formatMessage(
      {
        id: "feature.device.protocolNotice.ahead",
        defaultMessage:
          "This device sends fields that its mesh can't decode, and some of its readings are dropped. Move the mesh to a newer firmware and update the firmware on their devices.",
      },
    ),
    behind: formatMessage(
      {
        id: "feature.device.protocolNotice.behind",
        defaultMessage:
          "This device's firmware speaks Meshtastic {version}, older than its mesh's {protocol}, so some of its values are read differently. Update its firmware.",
      },
      { protocol: device.protocol, version: mismatch.kind === "behind" ? mismatch.version : "" },
    ),
  }[mismatch.kind];
  return (
    <WarningBanner
      title={formatMessage({ id: "feature.device.protocolNotice.title", defaultMessage: "Protocol mismatch" })}
      action={
        onChangeMesh && mismatch.kind === "ahead" ? (
          <Button type="button" size="small" onClick={onChangeMesh}>
            {formatMessage({ id: "feature.device.protocolNotice.changeMesh", defaultMessage: "Change mesh protocol" })}
          </Button>
        ) : undefined
      }
    >
      {message}
    </WarningBanner>
  );
}
