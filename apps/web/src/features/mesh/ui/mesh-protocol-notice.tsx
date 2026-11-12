import type { Mesh } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { StatusCopy } from "@/components/status-copy";

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
  const messages: string[] = [];
  if (mesh.protocol_status === "deprecated") {
    messages.push(
      mesh.protocol_sunset
        ? formatMessage(
            {
              id: "feature.mesh.protocolNotice.deprecatedUntil",
              defaultMessage:
                "Meshtastic {version} is deprecated and can no longer be chosen after {date}. Move this mesh to a newer protocol once its devices are updated.",
            },
            { version: mesh.protocol, date: formatDate(mesh.protocol_sunset, { dateStyle: "long" }) },
          )
        : formatMessage(
            {
              id: "feature.mesh.protocolNotice.deprecated",
              defaultMessage:
                "Meshtastic {version} is deprecated. Move this mesh to a newer protocol once its devices are updated.",
            },
            { version: mesh.protocol },
          ),
    );
  }
  if (mesh.protocol_status === "sunset") {
    messages.push(
      formatMessage(
        {
          id: "feature.mesh.protocolNotice.sunset",
          defaultMessage:
            "Meshtastic {version} is past its sunset. Its packets are still decoded, but move this mesh to a newer protocol once its devices are updated.",
        },
        { version: mesh.protocol },
      ),
    );
  }
  if (mismatched > 0) {
    messages.push(
      formatMessage(
        {
          id: "feature.mesh.protocolNotice.mismatch",
          defaultMessage:
            "{count, plural, one {# device runs} other {# devices run}} a protocol that does not match this mesh's, so some of their readings are lost or misread. Update their firmware or change the mesh's protocol.",
        },
        { count: mismatched },
      ),
    );
  }
  if (!messages.length) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 oa-squircle bg-background-secondary-default px-4 py-3 shadow-card">
      <StatusCopy className="text-text-primary">{messages.join(" ")}</StatusCopy>
      {onChange ? (
        <Button type="button" size="small" onClick={onChange}>
          {formatMessage({ id: "feature.mesh.protocolNotice.change", defaultMessage: "Change protocol" })}
        </Button>
      ) : null}
    </div>
  );
}
