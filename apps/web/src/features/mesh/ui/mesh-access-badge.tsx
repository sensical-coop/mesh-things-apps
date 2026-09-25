import type { Mesh } from "@mtt/contracts";
import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export type MeshAccessBadgeProps = {
  mesh: Pick<Mesh, "is_public">;
  canEdit: boolean;
};

/** "Public" for an open mesh, "Shared with you" for a granted one; nothing for a private mesh you edit. */
export function MeshAccessBadge({ mesh, canEdit }: MeshAccessBadgeProps): ReactElement | null {
  const { formatMessage } = useIntl();
  if (mesh.is_public) {
    return (
      <Chip variant="caption" color="blue" className="rounded-full">
        {formatMessage({ id: "feature.mesh.accessBadge.public", defaultMessage: "Public" })}
      </Chip>
    );
  }
  if (canEdit) return null;
  return (
    <Chip variant="caption" color="purple" className="rounded-full">
      {formatMessage({ id: "feature.mesh.accessBadge.shared", defaultMessage: "Shared with you" })}
    </Chip>
  );
}
