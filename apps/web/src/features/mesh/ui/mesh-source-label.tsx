import type { Mesh, SourceRead } from "@mtt/contracts";
import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { sourceTitle } from "@/features/source/model";

export type MeshSourceLabelProps = {
  mesh: Pick<Mesh, "source_id">;
  /** The caller's own sources, to name the one the mesh uses. */
  sources: readonly Pick<SourceRead, "id" | "label" | "server" | "topic">[];
};

/**
 * "Default broker", or the source's name on a bridged mesh. The API sends
 * `source_id` only to the mesh's owner, so anyone else sees a dash.
 */
export function MeshSourceLabel({ mesh, sources }: MeshSourceLabelProps): ReactElement {
  const { formatMessage } = useIntl();
  if (mesh.source_id === undefined) return <span className="text-text-tertiary">—</span>;
  if (mesh.source_id === null) {
    return (
      <span className="text-text-secondary">
        {formatMessage({ id: "feature.mesh.sourceLabel.default", defaultMessage: "Default broker" })}
      </span>
    );
  }
  const source = sources.find((candidate) => candidate.id === mesh.source_id);
  return (
    <Chip variant="caption" color="purple" className="rounded-full">
      {source
        ? sourceTitle(source)
        : formatMessage({ id: "feature.mesh.sourceLabel.custom", defaultMessage: "Custom source" })}
    </Chip>
  );
}
