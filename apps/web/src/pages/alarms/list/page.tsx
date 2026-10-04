import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { SmartFilterToolbar, useSmartFilters, type FilterSpec } from "@mtt/ui/components/smart-filters";
import { useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";
import { useTranslatedFilterLabels } from "@/hooks/use-translated-filter-labels";
import { useTranslatedFilterOperatorLabels } from "@/hooks/use-translated-filter-operator-labels";
import { deviceRepository } from "@/features/device/repository";
import { deviceTitle } from "@/features/device/model";
import { useTelemetryVariantOptions } from "@/features/device/use-telemetry-variant-options";
import { meshRepository } from "@/features/mesh/repository";
import { canEditMesh, meshTitle } from "@/features/mesh/model";
import { useMe } from "@/features/auth/use-me";
import { StatusCopy } from "@/components/status-copy";
import { SkeletonRows } from "@/components/skeleton-rows";
import { matchesListQuery } from "@/lib/list-filter";
import { pageHeadingClass } from "@/lib/page-heading";
import { MeshAlarmsList } from "./mesh-alarms-list";
import { MeshPicker } from "@/features/mesh/ui/mesh-picker";

// One mesh at a time, its devices collapsed until opened: listing every device's channels
// up front cost two requests per device and ran a large mesh into the API's rate limit.
export function AlarmsPage(): ReactElement {
  const { formatMessage } = useIntl();
  const filterLabels = useTranslatedFilterLabels();
  const filterOperatorLabels = useTranslatedFilterOperatorLabels();
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
  const devices = useQuery({
    ...meshRepository.devices({ path: { mesh_id: current?.id ?? "00000000-0000-4000-8000-000000000000" } }),
    enabled: current != null,
  });
  // One catalog request names every variant, instead of one per device.
  const variants = useQuery({ ...deviceRepository.variantCatalog(), enabled: me != null, retry: false });

  const variantOptions = useTelemetryVariantOptions();
  const specs = useMemo<FilterSpec[]>(
    () => [
      {
        key: "label",
        urlKey: "label",
        label: formatMessage({ id: "page.alarms.list.filters.label", defaultMessage: "Label" }),
        type: "text",
      },
      {
        key: "is_gateway",
        urlKey: "is_gateway",
        label: formatMessage({ id: "page.alarms.list.filters.role", defaultMessage: "Role" }),
        type: "select",
        options: [
          {
            value: "true",
            label: formatMessage({ id: "page.alarms.list.filters.roleGateway", defaultMessage: "Gateway" }),
          },
          {
            value: "false",
            label: formatMessage({ id: "page.alarms.list.filters.roleNode", defaultMessage: "Node" }),
          },
        ],
      },
      ...(variantOptions.length
        ? [
            {
              key: "telemetry_variant",
              urlKey: "telemetry",
              label: formatMessage({ id: "page.alarms.list.filters.telemetry", defaultMessage: "Telemetry" }),
              type: "multiselect" as const,
              options: variantOptions,
            },
          ]
        : []),
    ],
    [variantOptions, formatMessage],
  );
  const filters = useSmartFilters({ specs });
  const shownDevices = (devices.data ?? []).filter((device) =>
    matchesListQuery((field) => {
      switch (field) {
        case "label":
          return deviceTitle(device);
        case "is_gateway":
          return String(device.is_gateway);
        case "telemetry_variant":
          return device.telemetry_variant_ids;
        default:
          return undefined;
      }
    }, filters.queryString),
  );

  const meshesLoading = meshes.isPending || !me;

  return (
    <>
      <div className={pageHeadingClass}>
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
          {formatMessage({ id: "page.alarms.list.title", defaultMessage: "Alarms" })}
        </h1>
      </div>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle>
            {formatMessage({ id: "page.alarms.list.panel.title", defaultMessage: "Configured alarms" })}
          </FrameTitle>
          <FrameDescription>
            {formatMessage({
              id: "page.alarms.list.panel.descriptionByMesh",
              defaultMessage: "Select a mesh to configure the alarms on each channel.",
            })}
          </FrameDescription>
        </FrameHeader>
        <FramePanel className="flex flex-col gap-6">
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
                <SmartFilterToolbar filters={filters} labels={filterLabels} operatorLabels={filterOperatorLabels} />
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
                  variants={variants.data ?? []}
                />
              ) : null}
            </>
          ) : null}
        </FramePanel>
      </Frame>
    </>
  );
}
