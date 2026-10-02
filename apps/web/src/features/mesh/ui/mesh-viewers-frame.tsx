import type { Mesh, MeshViewer } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { useFormatters } from "@/hooks/use-formatters";
import { meshRepository } from "@/features/mesh/repository";
import { RevokeViewerDialog } from "@/features/mesh/ui/revoke-viewer-dialog";

export type MeshViewersFrameProps = {
  mesh: Pick<Mesh, "id" | "is_public">;
};

/** Owner-only: who else can view this mesh, with a revoke per grant. */
export function MeshViewersFrame({ mesh }: MeshViewersFrameProps): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const viewers = useQuery(meshRepository.viewers({ path: { mesh_id: mesh.id } }));
  const [grantToRevoke, setGrantToRevoke] = useState<MeshViewer | null>(null);

  return (
    <>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle>{formatMessage({ id: "feature.mesh.viewers.title", defaultMessage: "Shared with" })}</FrameTitle>
          <FrameDescription>
            {mesh.is_public
              ? formatMessage({
                  id: "feature.mesh.viewers.descriptionPublic",
                  defaultMessage: "This mesh is public: anyone signed in can view it. Only you can change it.",
                })
              : formatMessage({
                  id: "feature.mesh.viewers.description",
                  defaultMessage: "People you invited can view this mesh but can't change it.",
                })}
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          {viewers.isPending ? <SkeletonRows rows={2} /> : null}
          {viewers.error ? (
            <StatusCopy>
              {formatMessage({
                id: "feature.mesh.viewers.error",
                defaultMessage: "The list of people with access couldn't be loaded.",
              })}
            </StatusCopy>
          ) : null}
          {viewers.data && viewers.data.length === 0 ? (
            <StatusCopy>
              {formatMessage({
                id: "feature.mesh.viewers.empty",
                defaultMessage: "You haven't shared this mesh with anyone.",
              })}
            </StatusCopy>
          ) : null}
          {viewers.data?.length ? (
            <ul className="oa-arrive flex flex-col divide-y divide-separator-border">
              {viewers.data.map((grant) => (
                <li key={grant.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-col">
                    <span className="min-w-0 break-words text-body-medium text-text-primary">{grant.viewer.name}</span>
                    <span className="text-caption-1-regular text-text-secondary">
                      {formatMessage(
                        { id: "feature.mesh.viewers.since", defaultMessage: "Shared {when}" },
                        { when: formatWhen(grant.created_at) },
                      )}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    onClick={() => setGrantToRevoke(grant)}
                  >
                    {formatMessage({ id: "feature.mesh.viewers.revoke", defaultMessage: "Revoke access" })}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </FramePanel>
      </Frame>
      <RevokeViewerDialog meshId={mesh.id} grant={grantToRevoke} onClose={() => setGrantToRevoke(null)} />
    </>
  );
}
