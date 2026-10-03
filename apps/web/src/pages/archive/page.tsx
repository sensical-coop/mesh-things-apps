import { Navigate } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";
import { StatusCopy } from "@/components/status-copy";
import { pageHeadingClass } from "@/lib/page-heading";
import { readApiError } from "@/lib/api-errors";
import { useMe } from "@/features/auth/use-me";
import { canUseArchive, summarizeArchive } from "@/features/archive/model";
import { archiveRepository } from "@/features/archive/repository";
import { useArchiveCredentials } from "@/features/archive/use-archive-credentials";
import { ArchiveConnectFrame } from "@/features/archive/ui/archive-connect-frame";
import { ArchiveDevicesFrame } from "@/features/archive/ui/archive-devices-frame";
import { ArchiveFilesFrame } from "@/features/archive/ui/archive-files-frame";
import { ArchiveMeshesFrame, type ArchiveMeshRow } from "@/features/archive/ui/archive-meshes-frame";
import { deviceRepository } from "@/features/device/repository";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";
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

  const manifests = useQueries({
    queries: archivable.map((mesh) => ({
      ...archiveRepository.manifest({ path: { mesh_id: mesh.id } }),
      // A 404 on one's own mesh means the instance runs no archive; asking again won't help.
      retry: false,
    })),
  });
  const noArchive = manifests.some((query) => readApiError(query.error).status === 404);

  const rows: ArchiveMeshRow[] = archivable.map((mesh, index) => {
    const manifest = manifests[index]?.data;
    return {
      id: mesh.id,
      title: meshTitle(mesh),
      devices: archivedByMesh.get(mesh.id)?.devices ?? 0,
      archived: archivedByMesh.get(mesh.id)?.archived ?? 0,
      summary: manifest ? summarizeArchive(manifest.partitions) : null,
    };
  });
  // The one asked for, else the first that archives something, else the first.
  const current =
    archivable.find((mesh) => mesh.id === selected) ??
    archivable.find((mesh) => (archivedByMesh.get(mesh.id)?.archived ?? 0) > 0) ??
    archivable[0];
  const currentManifest = current ? manifests[archivable.indexOf(current)] : undefined;
  const meshDevices = useQuery({
    ...meshRepository.devices({ path: { mesh_id: current?.id ?? "00000000-0000-4000-8000-000000000000" } }),
    enabled: current != null,
  });
  const access = useArchiveCredentials(current?.id);

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
            <ArchiveMeshesFrame
              rows={rows}
              pending={meshes.isPending || devices.isPending}
              selectedId={current?.id ?? null}
              onSelect={(meshId) => void setSelected(meshId)}
            />
            {current ? (
              <>
                <ArchiveDevicesFrame
                  meshTitle={meshTitle(current)}
                  devices={meshDevices.data}
                  pending={meshDevices.isPending}
                  failed={meshDevices.isError}
                />
                <ArchiveFilesFrame
                  key={current.id}
                  meshId={current.id}
                  meshTitle={meshTitle(current)}
                  access={access}
                  manifest={currentManifest?.data}
                  pending={currentManifest?.isPending ?? true}
                  failed={currentManifest?.isError ?? false}
                />
                <ArchiveConnectFrame access={access} prefix={currentManifest?.data?.prefix} />
              </>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
