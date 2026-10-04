import type { DeviceRead } from "@mtt/contracts";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { useQuery } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { type ReactElement, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { DataTable } from "@mtt/ui/components/data-table";
import { SmartFilterToolbar, useSmartFilters, type FilterSpec } from "@mtt/ui/components/smart-filters";
import { useFormatters } from "@/hooks/use-formatters";
import { useTranslatedFilterLabels } from "@/hooks/use-translated-filter-labels";
import { useTranslatedFilterOperatorLabels } from "@/hooks/use-translated-filter-operator-labels";
import { routes } from "@/router";
import { pageHeadingClass } from "@/lib/page-heading";
import { listQueryBoolean, matchesListQuery } from "@/lib/list-filter";
import { SettingsButton } from "@/components/settings-button";
import { SkeletonRows } from "@/components/skeleton-rows";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { deviceRepository } from "@/features/device/repository";
import { deviceLastSeen, deviceTitle } from "@/features/device/model";
import { DeviceAllowedBadge } from "@/features/device/ui/allowed-badge";
import { DeviceKindBadge } from "@/features/device/ui/kind-badge";
import { DeviceSettingsDialog } from "@/features/device/ui/settings-dialog";
import { useTelemetryVariantOptions } from "@/features/device/use-telemetry-variant-options";
import { DeviceSilentBadge } from "@/features/device/ui/silent-badge";
import { canArchiveDevice } from "@/features/archive/model";
import { ArchiveButton } from "@/features/archive/ui/archive-button";
import { meshRepository } from "@/features/mesh/repository";
import { canEditMesh, meshTitle } from "@/features/mesh/model";
import { RouterButtonLink } from "@/components/router-button-link";

type DeviceRow = DeviceRead & { meshLabel: string; ownerId: string };

const col = legacyCreateColumnHelper<DeviceRow>();

export function DevicesPage(): ReactElement {
  const { formatMessage } = useIntl();
  const { formatLastSeen, formatWhen, toRelative } = useFormatters();
  const filterLabels = useTranslatedFilterLabels();
  const filterOperatorLabels = useTranslatedFilterOperatorLabels();
  const [settingsDevice, setSettingsDevice] = useState<DeviceRow | null>(null);
  const { me, isOperator, isSuperuser, meId, ownerName } = useOwnerDirectory();
  const meshes = useQuery(meshRepository.list());
  const meshOptions = useMemo(
    () => (meshes.data ?? []).map((mesh) => ({ value: mesh.id, label: meshTitle(mesh) })),
    [meshes.data],
  );
  const variantOptions = useTelemetryVariantOptions();
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
      ...(variantOptions.length
        ? [
            {
              key: "telemetry_variant",
              urlKey: "telemetry",
              label: formatMessage({ id: "page.devices.list.filters.telemetry", defaultMessage: "Telemetry" }),
              type: "multiselect" as const,
              options: variantOptions,
            },
          ]
        : []),
      // Only the owner (or a superuser) sees a device's setting, and only operators store devices.
      ...(isOperator
        ? [
            {
              key: "archive_enabled",
              urlKey: "s3",
              label: formatMessage({ id: "page.devices.list.filters.s3", defaultMessage: "S3 storage" }),
              type: "select" as const,
              options: [
                { value: "true", label: formatMessage({ id: "page.devices.list.filters.s3On", defaultMessage: "On" }) },
                { value: "false", label: formatMessage({ id: "page.devices.list.filters.s3Off", defaultMessage: "Off" }) },
              ],
            },
          ]
        : []),
    ],
    [meshOptions, variantOptions, formatMessage, isOperator],
  );
  const filters = useSmartFilters({ specs });
  // The API only takes bare values, and rows don't say whether a blueprint is attached,
  // so that one filter goes to the server; the rest run on the loaded rows, like meshes.
  const hasPostprocessing = listQueryBoolean(filters.queryString, "has_postprocessing");
  const devices = useQuery(
    deviceRepository.list(
      hasPostprocessing === undefined ? undefined : { query: { has_postprocessing: String(hasPostprocessing) } },
    ),
  );
  const meshNames = new Map((meshes.data ?? []).map((m) => [m.id, meshTitle(m)]));
  const meshOwners = new Map((meshes.data ?? []).map((m) => [m.id, m.owner_id]));
  const rows = useMemo<DeviceRow[]>(
    () =>
      (devices.data ?? []).map((device) => ({
        ...device,
        meshLabel: meshNames.get(device.mesh_id) ?? device.mesh_id,
        ownerId: meshOwners.get(device.mesh_id) ?? "",
      })),
    [devices.data, meshes.data],
  );
  const shownRows = rows.filter((row) =>
    matchesListQuery((field) => {
      switch (field) {
        case "label":
          return deviceTitle(row);
        case "mesh_id":
          return row.mesh_id;
        case "is_gateway":
          return String(row.is_gateway);
        case "is_allowed":
          return String(row.is_allowed);
        case "telemetry_variant":
          return row.telemetry_variant_ids;
        // Devices whose setting the API doesn't send match neither On nor Off.
        case "archive_enabled":
          return row.archive_enabled === undefined ? "" : String(row.archive_enabled);
        default:
          return undefined;
      }
    }, filters.queryString),
  );
  // Devices on public meshes can belong to someone else, so say whose.
  const showOwner = isSuperuser || rows.some((row) => row.ownerId !== meId);

  const columns = useMemo(
    () => [
      col.accessor((row) => deviceTitle(row), {
        id: "device",
        header: formatMessage({ id: "page.devices.list.columns.device", defaultMessage: "Device" }),
        cell: (info) => (
          <Link
            to={routes.device}
            params={{ deviceUuid: info.row.original.uuid }}
            className="rounded-full outline-none hover:text-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            {info.getValue()}
          </Link>
        ),
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
      ...(showOwner
        ? [
            col.accessor("ownerId", {
              id: "owner",
              header: formatMessage({ id: "page.devices.list.columns.owner", defaultMessage: "Owner" }),
              cell: (info) => (
                <span className="text-text-secondary">
                  {info.getValue() === meId
                    ? formatMessage(
                        { id: "common.ownerColumn.me", defaultMessage: "{name} (me)" },
                        { name: ownerName(info.getValue()) },
                      )
                    : ownerName(info.getValue())}
                </span>
              ),
            }),
          ]
        : []),
      col.accessor(deviceLastSeen, {
        id: "last_seen",
        header: formatMessage({ id: "page.devices.list.columns.lastSeen", defaultMessage: "Last seen" }),
        // Relative only, to keep the row narrow; the exact time is in the tooltip.
        cell: (info) => {
          const seen = info.getValue();
          return (
            <span className="whitespace-nowrap tabular-nums text-text-secondary" title={seen ? formatWhen(seen) : undefined}>
              {seen ? (toRelative(seen) ?? formatWhen(seen)) : formatLastSeen(null)}
            </span>
          );
        },
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
          <div className="flex justify-start gap-2 whitespace-nowrap">
            <RouterButtonLink to={routes.device} params={{ deviceUuid: row.original.uuid }} size="xs" variant="secondary">
              {formatMessage({ id: "page.devices.list.open", defaultMessage: "Open" })}
            </RouterButtonLink>
            {canEditMesh({ owner_id: row.original.ownerId }, me) ? (
              <SettingsButton
                label={formatMessage({ id: "page.devices.detail.editSettings", defaultMessage: "Edit settings" })}
                onClick={() => setSettingsDevice(row.original)}
              />
            ) : null}
            {canArchiveDevice(row.original, me, row.original.ownerId) ? <ArchiveButton device={row.original} /> : null}
          </div>
        ),
      }),
    ],
    [formatMessage, formatLastSeen, formatWhen, toRelative, me, meId, ownerName, showOwner],
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
                data={shownRows}
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
                        defaultMessage: "No devices yet. Register a device in a Mesh.",
                      })
                }
              />
            )}
          </FramePanel>
        </Frame>
      </div>
      {settingsDevice ? (
        <DeviceSettingsDialog device={settingsDevice} open onClose={() => setSettingsDevice(null)} />
      ) : null}
    </>
  );
}
