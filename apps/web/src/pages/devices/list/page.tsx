import type { DeviceRead } from "@mtt/contracts";
import { ButtonLink } from "@mtt/ui/components/base/buttons/button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { useQuery } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";
import { DataTable } from "@mtt/ui/components/data-table";
import { SmartFilterToolbar, useSmartFilters, type FilterSpec } from "@mtt/ui/components/smart-filters";
import { useFormatters } from "@/hooks/use-formatters";
import { useTranslatedFilterLabels } from "@/hooks/use-translated-filter-labels";
import { useTranslatedFilterOperatorLabels } from "@/hooks/use-translated-filter-operator-labels";
import { listQuery } from "@mtt/ui/lib/filter-url";
import { href, routes } from "@/router";
import { pageHeadingClass } from "@/lib/page-heading";
import { SkeletonRows } from "@/components/skeleton-rows";
import { deviceRepository } from "@/features/device/repository";
import { deviceTitle } from "@/features/device/model";
import { DeviceAllowedBadge } from "@/features/device/ui/allowed-badge";
import { DeviceKindBadge } from "@/features/device/ui/kind-badge";
import { DeviceSilentBadge } from "@/features/device/ui/silent-badge";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";

type DeviceRow = DeviceRead & { meshLabel: string };

const col = legacyCreateColumnHelper<DeviceRow>();

export function DevicesPage(): ReactElement {
  const { formatMessage } = useIntl();
  const { formatLastSeen } = useFormatters();
  const filterLabels = useTranslatedFilterLabels();
  const filterOperatorLabels = useTranslatedFilterOperatorLabels();
  const meshes = useQuery(meshRepository.list());
  const meshOptions = useMemo(
    () => (meshes.data ?? []).map((mesh) => ({ value: mesh.id, label: meshTitle(mesh) })),
    [meshes.data],
  );
  const specs = useMemo<FilterSpec[]>(
    () => [
      {
        key: "label",
        urlKey: "label",
        label: formatMessage({ id: "page.devices.list.filters.label", defaultMessage: "Label" }),
        type: "text",
      },
      {
        key: "mesh_id",
        urlKey: "mesh_id",
        label: formatMessage({ id: "page.devices.list.filters.mesh", defaultMessage: "Mesh" }),
        type: "select",
        options: meshOptions,
      },
      {
        key: "is_gateway",
        urlKey: "is_gateway",
        label: formatMessage({ id: "page.devices.list.filters.role", defaultMessage: "Role" }),
        type: "select",
        options: [
          {
            value: "true",
            label: formatMessage({ id: "page.devices.list.filters.roleGateway", defaultMessage: "Gateway" }),
          },
          {
            value: "false",
            label: formatMessage({ id: "page.devices.list.filters.roleNode", defaultMessage: "Node" }),
          },
        ],
      },
      {
        key: "is_allowed",
        urlKey: "is_allowed",
        label: formatMessage({ id: "page.devices.list.filters.allowed", defaultMessage: "Allowed" }),
        type: "select",
        options: [
          {
            value: "true",
            label: formatMessage({ id: "page.devices.list.filters.allowedTrue", defaultMessage: "Allowed" }),
          },
          {
            value: "false",
            label: formatMessage({ id: "page.devices.list.filters.allowedFalse", defaultMessage: "Blocked" }),
          },
        ],
      },
      {
        key: "has_postprocessing",
        urlKey: "has_postprocessing",
        label: formatMessage({ id: "page.devices.list.filters.blueprint", defaultMessage: "Blueprint" }),
        type: "select",
        options: [
          {
            value: "true",
            label: formatMessage({
              id: "page.devices.list.filters.blueprintTrue",
              defaultMessage: "With blueprint",
            }),
          },
          {
            value: "false",
            label: formatMessage({
              id: "page.devices.list.filters.blueprintFalse",
              defaultMessage: "Without blueprint",
            }),
          },
        ],
      },
    ],
    [meshOptions, formatMessage],
  );
  const filters = useSmartFilters({ specs });
  const devices = useQuery(deviceRepository.list({ query: listQuery(filters.queryString) }));
  const meshNames = new Map((meshes.data ?? []).map((m) => [m.id, meshTitle(m)]));

  const rows = useMemo<DeviceRow[]>(
    () =>
      (devices.data ?? []).map((device) => ({
        ...device,
        meshLabel: meshNames.get(device.mesh_id) ?? device.mesh_id,
      })),
    [devices.data, meshes.data],
  );

  const columns = useMemo(
    () => [
      col.accessor((row) => deviceTitle(row), {
        id: "device",
        header: formatMessage({ id: "page.devices.list.columns.device", defaultMessage: "Device" }),
      }),
      col.accessor("meshLabel", {
        header: formatMessage({ id: "page.devices.list.columns.mesh", defaultMessage: "Mesh" }),
        cell: (info) => <span className="text-text-secondary">{info.getValue()}</span>,
      }),
      col.accessor("is_gateway", {
        header: formatMessage({ id: "page.devices.list.columns.role", defaultMessage: "Role" }),
        cell: (info) => <DeviceKindBadge isGateway={info.getValue()} />,
      }),
      col.accessor("is_allowed", {
        header: formatMessage({ id: "page.devices.list.columns.allowed", defaultMessage: "Allowed" }),
        cell: (info) => <DeviceAllowedBadge allowed={info.getValue()} />,
      }),
      col.display({
        id: "radio",
        header: formatMessage({ id: "page.devices.list.columns.radio", defaultMessage: "Radio" }),
        cell: (info) => <DeviceSilentBadge device={info.row.original} />,
      }),
      col.accessor("last_seen", {
        header: formatMessage({ id: "page.devices.list.columns.lastSeen", defaultMessage: "Last seen" }),
        cell: (info) => (
          <span className="tabular-nums text-text-secondary">{formatLastSeen(info.getValue())}</span>
        ),
      }),
      col.display({
        id: "open",
        enableSorting: false,
        header: () => (
          <span className="block text-end">
            {formatMessage({ id: "page.devices.list.columns.actions", defaultMessage: "Actions" })}
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ButtonLink href={href(routes.device, { deviceUuid: row.original.uuid })} size="xs" variant="secondary">
              {formatMessage({ id: "page.devices.list.open", defaultMessage: "Open" })}
            </ButtonLink>
          </div>
        ),
      }),
    ],
    [formatMessage, formatLastSeen],
  );

  return (
    <>
      <div className={pageHeadingClass}>
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
          {formatMessage({ id: "page.devices.list.title", defaultMessage: "Devices" })}
        </h1>
      </div>
      <div className="flex flex-col gap-6">
        <Frame className="shadow-card">
          <FrameHeader>
            <FrameTitle>
              {formatMessage({ id: "page.devices.list.inventory.title", defaultMessage: "Inventory" })}
            </FrameTitle>
            <FrameDescription>
              {devices.isPending
                ? formatMessage({ id: "page.devices.list.inventory.loading", defaultMessage: "Loading devices." })
                : devices.error
                  ? formatMessage({
                      id: "page.devices.list.inventory.error",
                      defaultMessage: "Devices didn't load. Check your connection to the API and try again.",
                    })
                  : formatMessage({
                      id: "page.devices.list.inventory.description",
                      defaultMessage: "Filter, then open a device for readings.",
                    })}
            </FrameDescription>
          </FrameHeader>
          <FramePanel>
            <div className="mb-4">
              <SmartFilterToolbar filters={filters} labels={filterLabels} operatorLabels={filterOperatorLabels} />
            </div>
            {devices.isPending ? <SkeletonRows /> : null}
            {devices.error ? null : devices.isPending ? null : (
              <DataTable
                data={rows}
                columns={columns}
                getRowId={(row) => row.uuid}
                previousPageLabel={formatMessage({
                  id: "common.dataTable.previousPage",
                  defaultMessage: "Previous page",
                })}
                nextPageLabel={formatMessage({ id: "common.dataTable.nextPage", defaultMessage: "Next page" })}
                pageRangeOfLabel={formatMessage({ id: "common.dataTable.of", defaultMessage: "of" })}
                empty={
                  filters.active
                    ? formatMessage({
                        id: "page.devices.list.empty.filtered",
                        defaultMessage: "No devices match these filters.",
                      })
                    : formatMessage({
                        id: "page.devices.list.empty.default",
                        defaultMessage: "No devices yet. Register a device from a mesh.",
                      })
                }
              />
            )}
          </FramePanel>
        </Frame>
      </div>
    </>
  );
}
