import { Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { pageHeadingClass } from "@/lib/page-heading";
import { readApiError } from "@/lib/api-errors";
import { useMe } from "@/features/auth/use-me";
import { canUseArchive, summarizeArchive } from "@/features/archive/model";
import { archiveRepository } from "@/features/archive/repository";
import { useArchiveCredentials } from "@/features/archive/use-archive-credentials";
import { ArchiveConnectFrame } from "@/features/archive/ui/archive-connect-frame";
import { ArchiveExportsFrame } from "@/features/archive/ui/archive-exports-frame";
import { ArchiveFilesFrame } from "@/features/archive/ui/archive-files-frame";
import { ArchiveMeshSummary } from "@/features/archive/ui/archive-mesh-summary";
import { useRequestExport } from "@/features/export/use-request-export";
import { deviceRepository } from "@/features/device/repository";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";
import { MeshPicker } from "@/features/mesh/ui/mesh-picker";
import { routes } from "@/router";

export function ArchivePage(): ReactElement {
  const { formatMessage } = useIntl();
  const { me, meId, isOperator } = useMe();
  const [selected, setSelected] = useQueryState("mesh", parseAsString);
  const meshes = useQuery({ ...meshRepository.list(), enabled: isOperator });
  const devices = useQuery({ ...deviceRepository.list(), enabled: isOperator });

  // An operator's own meshes; a superuser's too, plus every mesh that already archives something.
  const archivedByMesh = useMemo(() => {
    const counts = new Map<string, { devices: number; archived: number }>();
    for (const device of devices.data ?? []) {
      const row = counts.get(device.mesh_id) ?? { devices: 0, archived: 0 };
      row.devices += 1;
      if (device.archive_enabled) row.archived += 1;
      counts.set(device.mesh_id, row);
    }
    return counts;
  }, [devices.data]);
  const archivable = (meshes.data ?? []).filter(
    (mesh) =>
      canUseArchive(me, mesh.owner_id) && (mesh.owner_id === meId || (archivedByMesh.get(mesh.id)?.archived ?? 0) > 0),
  );

  // The one asked for, else the first that archives something, else the first.
  const current =
    archivable.find((mesh) => mesh.id === selected) ??
    archivable.find((mesh) => (archivedByMesh.get(mesh.id)?.archived ?? 0) > 0) ??
    archivable[0];
  // Only the chosen mesh's file list: one request, however many meshes there are.
  const currentManifest = useQuery({
    ...archiveRepository.manifest({ path: { mesh_id: current?.id ?? "00000000-0000-4000-8000-000000000000" } }),
    enabled: current != null,
    // A 404 on one's own mesh means the instance runs no archive; asking again won't help.
    retry: false,
  });
  const noArchive = readApiError(currentManifest.error).status === 404;
  const access = useArchiveCredentials(current?.id);
  const requested = useRequestExport();

  // Wait for `me` before deciding; members never see this page, and a typed URL goes back to meshes.
  if (me && !isOperator) return <Navigate to={routes.meshes} replace />;

  return (
    <>
      <div className={pageHeadingClass}>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.archive.title", defaultMessage: "Archive" })}
          </h1>
          <p className="max-w-2xl text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.archive.description",
              defaultMessage:
                "Long-term storage (S3) for devices of your choice.",
            })}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        {meshes.error || devices.error ? (
          <StatusCopy>
            {formatMessage({
              id: "page.archive.error",
              defaultMessage: "Meshes didn't load. Check your connection to the API and try again.",
            })}
          </StatusCopy>
        ) : null}
        {noArchive ? (
          <StatusCopy>
            {formatMessage({
              id: "page.archive.unavailable",
              defaultMessage:
                "This instance doesn't run the archive. Ask the administrator to enable the full profile with object storage.",
            })}
          </StatusCopy>
        ) : (
          <>
            {meshes.isPending || devices.isPending ? <SkeletonRows rows={2} /> : null}
            {meshes.isSuccess && devices.isSuccess && !current ? (
              <StatusCopy>
                {formatMessage({
                  id: "page.archive.noMeshes",
                  defaultMessage: "No meshes yet. Create a mesh and register its devices to archive them.",
                })}
              </StatusCopy>
            ) : null}
            {current ? (
              <>
                <ArchiveExportsFrame
                  // Remounted once the file list is in, so the range starts from what's stored.
                  key={`exports-${current.id}-${currentManifest.isSuccess}`}
                  meshId={current.id}
                  manifest={currentManifest.data}
                  requested={requested}
                  picker={
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <MeshPicker meshes={archivable} value={current.id} onChange={(meshId) => void setSelected(meshId)} />
                      <ArchiveMeshSummary
                        devices={archivedByMesh.get(current.id)?.devices ?? 0}
                        archived={archivedByMesh.get(current.id)?.archived ?? 0}
                        summary={currentManifest.data ? summarizeArchive(currentManifest.data.partitions) : null}
                      />
                    </div>
                  }
                />
                <ArchiveConnectFrame access={access} prefix={currentManifest.data?.prefix} />
                <ArchiveFilesFrame
                  key={current.id}
                  meshId={current.id}
                  meshTitle={meshTitle(current)}
                  access={access}
                  manifest={currentManifest.data}
                  pending={currentManifest.isPending}
                  failed={currentManifest.isError}
                  requested={requested}
                />
              </>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
