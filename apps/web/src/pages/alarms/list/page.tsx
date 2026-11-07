import { ListScaffold } from "@/components/list-scaffold";
import { SmartFilterToolbar, useSmartFilters } from "@/components/smart-filters";
import { useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";
import { deviceFilterSpecs, deviceFilterValue } from "@/features/device/device-filter";
import { useTelemetryVariants } from "@/features/device/use-telemetry-variant-options";
import { meshRepository } from "@/features/mesh/repository";
import { canEditMesh, meshTitle } from "@/features/mesh/model";
import { useMe } from "@/features/auth/use-me";
import { StatusCopy } from "@/components/status-copy";
import { SkeletonRows } from "@/components/skeleton-rows";
import { matchesListQuery } from "@mtt/contracts/list-filter";
import { MeshAlarmsList } from "./mesh-alarms-list";
import { MeshPicker } from "@/features/mesh/ui/mesh-picker";

// One mesh at a time, its devices collapsed until opened: listing every device's channels
// up front cost two requests per device and ran a large mesh into the API's rate limit.
export function AlarmsPage(): ReactElement {
  const { formatMessage } = useIntl();
  const { me } = useMe();
  const [selected, setSelected] = useQueryState("mesh", parseAsString);
  const meshes = useQuery(meshRepository.list());
  // Alarms are configuration, so public meshes someone else owns don't belong here.
  const editableMeshes = useMemo(
    () =>
      (meshes.data ?? [])
        .filter((mesh) => canEditMesh(mesh, me))
        .sort((a, b) => meshTitle(a).localeCompare(meshTitle(b))),
    [meshes.data, me],
  );
  const current = editableMeshes.find((mesh) => mesh.id === selected) ?? editableMeshes[0];
  const devices = useQuery(meshRepository.devices(current?.id));
  const { options: variantOptions, variants } = useTelemetryVariants();
  const specs = useMemo(
    () => deviceFilterSpecs({ formatMessage, variantOptions }),
    [variantOptions, formatMessage],
  );
  const filters = useSmartFilters({ specs });
  const shownDevices = (devices.data ?? []).filter((device) =>
    matchesListQuery((field) => deviceFilterValue(device, field), filters.queryString),
  );

  const meshesLoading = meshes.isPending || !me;

  return (
    <ListScaffold
      title={formatMessage({ id: "page.alarms.list.title", defaultMessage: "Alarms" })}
      panelTitle={formatMessage({ id: "page.alarms.list.panel.title", defaultMessage: "Configured alarms" })}
      panelDescription={formatMessage({
        id: "page.alarms.list.panel.descriptionByMesh",
        defaultMessage: "Select a mesh to configure the alarms on each channel.",
      })}
      panelClassName="flex flex-col gap-6"
    >
          {meshesLoading ? <SkeletonRows rows={3} /> : null}
          {meshes.isError ? (
            <StatusCopy>
              {formatMessage({
                id: "page.alarms.list.meshesError",
                defaultMessage: "Meshes didn't load. Check your connection to the API and try again.",
              })}
            </StatusCopy>
          ) : null}
          {!meshesLoading && meshes.isSuccess && !current ? (
            <StatusCopy>
              {formatMessage({
                id: "page.alarms.list.noMeshes",
                defaultMessage: "No meshes of yours yet. Alarms are set on the devices of a mesh you own.",
              })}
            </StatusCopy>
          ) : null}
          {current ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <MeshPicker meshes={editableMeshes} value={current.id} onChange={(meshId) => void setSelected(meshId)} />
                <SmartFilterToolbar filters={filters} />
              </div>
              {devices.isPending ? <SkeletonRows rows={3} /> : null}
              {devices.isError ? (
                <StatusCopy>
                  {formatMessage({
                    id: "page.alarms.list.devicesError",
                    defaultMessage: "Devices didn't load. Check your connection to the API and try again.",
                  })}
                </StatusCopy>
              ) : null}
              {devices.isSuccess && !shownDevices.length ? (
                <StatusCopy>
                  {filters.active
                    ? formatMessage({
                        id: "page.alarms.list.emptyFiltered",
                        defaultMessage: "No devices match these filters.",
                      })
                    : formatMessage({
                        id: "page.alarms.list.emptyMesh",
                        defaultMessage: "No devices registered on this mesh yet.",
                      })}
                </StatusCopy>
              ) : null}
              {devices.isSuccess && shownDevices.length ? (
                <MeshAlarmsList
                  key={`${current.id}?${filters.queryString}`}
                  devices={shownDevices}
                  variants={variants}
                />
              ) : null}
            </>
          ) : null}
    </ListScaffold>
  );
}
