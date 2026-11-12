import type { Mesh } from "@mtt/contracts";
import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export type MeshProtocolChipProps = {
  mesh: Pick<Mesh, "protocol" | "protocol_status">;
};

/** The mesh's Meshtastic version, tinted once that version is on its way out. */
export function MeshProtocolChip({ mesh }: MeshProtocolChipProps): ReactElement | null {
  const { formatMessage } = useIntl();
  if (!mesh.protocol) return null;
  const color = mesh.protocol_status === "sunset" ? "rose" : mesh.protocol_status === "deprecated" ? "orange" : "neutral";
  return (
    <Chip variant="caption" color={color} className="rounded-full">
      {formatMessage(
        { id: "feature.mesh.protocolChip.label", defaultMessage: "Meshtastic {version}" },
        { version: mesh.protocol },
      )}
    </Chip>
  );
}
