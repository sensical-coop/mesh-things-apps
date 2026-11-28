import type { Mesh } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { WarningBanner } from "@/components/warning-banner";

export type MeshProtocolNoticeProps = {
  mesh: Pick<Mesh, "protocol" | "protocol_status" | "protocol_sunset">;
  /** Devices whose readings are lost or misread under the mesh's version. */
  mismatched: number;
  /** Only someone who can edit the mesh gets the button. */
  onChange?: () => void;
};

/** On the mesh page when its protocol needs attention: on its way out, or not what some devices run. */
export function MeshProtocolNotice({ mesh, mismatched, onChange }: MeshProtocolNoticeProps): ReactElement | null {
  const { formatMessage, formatDate } = useIntl();
  const action = onChange ? (
    <Button type="button" size="small" onClick={onChange}>
      {formatMessage({ id: "feature.mesh.protocolNotice.change", defaultMessage: "Change protocol" })}
    </Button>
  ) : undefined;
  const banners: ReactElement[] = [];
  if (mismatched > 0) {
    banners.push(
      <WarningBanner
        key="mismatch"
        title={formatMessage({
          id: "feature.mesh.protocolNotice.mismatchTitle",
          defaultMessage: "Multiple firmwares detected",
        })}
        action={action}
      >
        {formatMessage(
          {
            id: "feature.mesh.protocolNotice.mismatch",
            defaultMessage:
              "{count,plural,one{We detected that the firmware version of # device is different from the one defined for this mesh. It is possible that some of their readings are lost or misread as a consequence. Update their firmware or change the mesh's protocol.} other{We detected that the firmware version of # devices is different from the one defined for this mesh. It is possible that some of their readings are lost or misread as a consequence. Update their firmware or change the mesh's protocol.}}",
          },
          { count: mismatched },
        )}
      </WarningBanner>,
    );
  }
  if (mesh.protocol_status === "deprecated") {
    banners.push(
      <WarningBanner
        key="deprecated"
        title={formatMessage({ id: "feature.mesh.protocolNotice.deprecatedTitle", defaultMessage: "Protocol deprecated" })}
        action={mismatched > 0 ? undefined : action}
      >
        {mesh.protocol_sunset
          ? formatMessage(
              {
                id: "feature.mesh.protocolNotice.deprecatedUntil",
                defaultMessage:
                  "Meshtastic {version} is deprecated and can no longer be chosen after {date}. Move this mesh to a newer protocol once its devices are updated.",
              },
              { version: mesh.protocol, date: formatDate(mesh.protocol_sunset, { dateStyle: "long", timeZone: "UTC" }) },
            )
          : formatMessage(
              {
                id: "feature.mesh.protocolNotice.deprecated",
                defaultMessage:
                  "Meshtastic {version} is deprecated. Move this mesh to a newer protocol once its devices are updated.",
              },
              { version: mesh.protocol },
            )}
      </WarningBanner>,
    );
  }
  if (mesh.protocol_status === "sunset") {
    banners.push(
      <WarningBanner
        key="sunset"
        title={formatMessage({ id: "feature.mesh.protocolNotice.sunsetTitle", defaultMessage: "Protocol past its sunset" })}
        action={mismatched > 0 ? undefined : action}
      >
        {formatMessage(
          {
            id: "feature.mesh.protocolNotice.sunset",
            defaultMessage:
              "Meshtastic {version} is past its sunset. Its packets are still decoded, but move this mesh to a newer protocol once its devices are updated.",
          },
          { version: mesh.protocol },
        )}
      </WarningBanner>,
    );
  }
  return banners.length ? <>{banners}</> : null;
}
