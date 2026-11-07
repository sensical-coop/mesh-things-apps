import { ListScaffold } from "@/components/list-scaffold";
import { useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { useMe } from "@/features/auth/use-me";
import { canUseArchive, summarizeArchive } from "@/features/archive/model";
import { archiveRepository, isArchiveUnavailable } from "@/features/archive/repository";
import { useArchiveCredentials } from "@/features/archive/use-archive-credentials";
import { ArchiveConnectFrame } from "@/features/archive/ui/archive-connect-frame";
import { ArchiveExportsFrame } from "@/features/export/ui/archive-exports-frame";
import { ArchiveFilesFrame } from "@/features/archive/ui/archive-files-frame";
import { ArchiveMeshSummary } from "@/features/archive/ui/archive-mesh-summary";
import { ExportLimits } from "@/features/export/ui/export-limits";
import { useRequestExport } from "@/features/export/use-request-export";
import { deviceRepository } from "@/features/device/repository";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";
import { MeshPicker } from "@/features/mesh/ui/mesh-picker";

export function ArchiveView(): ReactElement {
  const { formatMessage } = useIntl();
  const { me, meId } = useMe();
  const [selected, setSelected] = useQueryState("mesh", parseAsString);
  const meshes = useQuery(meshRepository.list());
  const devices = useQuery(deviceRepository.list());

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
  const currentManifest = useQuery(archiveRepository.manifest(current?.id));
  const noArchive = isArchiveUnavailable(currentManifest.error);
  const access = useArchiveCredentials(current?.id);
  const requested = useRequestExport();

  return (
    <>
      <ListScaffold
        title={formatMessage({ id: "page.archive.title", defaultMessage: "Archive" })}
        subtitle={formatMessage({
          id: "page.archive.description",
          defaultMessage: "Long-term storage (S3) for devices of your choice.",
        })}
      >
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
                <ExportLimits />
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
                <ArchiveConnectFrame access={access} prefix={currentManifest.data?.prefix} meshTitle={meshTitle(current)} />
                <ArchiveFilesFrame
                  key={current.id}
                  meshId={current.id}
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
      </ListScaffold>
    </>
  );
}
