import type { Mesh } from "@mtt/contracts";
import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export type MeshAccessBadgeProps = {
  mesh: Pick<Mesh, "is_public">;
};

/** "Public" for an open mesh; nothing for a private one. */
export function MeshAccessBadge({ mesh }: MeshAccessBadgeProps): ReactElement | null {
  const { formatMessage } = useIntl();
  if (!mesh.is_public) return null;
  return (
    <Chip variant="caption" color="blue" className="rounded-full">
      {formatMessage({ id: "feature.mesh.accessBadge.public", defaultMessage: "Public" })}
    </Chip>
  );
}
