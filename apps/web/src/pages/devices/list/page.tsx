import type { DeviceRead } from "@mtt/contracts";
import { useQuery } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { type ReactElement, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { DataTable } from "@mtt/ui/components/data-table";
import { SmartFilterToolbar, useSmartFilters } from "@/components/smart-filters";
import { useFormatters } from "@/hooks/use-formatters";
import { routes } from "@/router";
import { matchesListQuery } from "@mtt/contracts/list-filter";
import { ListScaffold } from "@/components/list-scaffold";
import { SettingsButton } from "@/components/settings-button";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { deviceFilterSpecs, deviceFilterValue, deviceListParams } from "@/features/device/device-filter";
import { deviceRepository } from "@/features/device/repository";
import { deviceLastSeen, deviceTitle } from "@/features/device/model";
import { DeviceAllowedBadge } from "@/features/device/ui/allowed-badge";
import { DeviceKindBadge } from "@/features/device/ui/kind-badge";
import { DeviceSettingsDialog } from "@/features/device/ui/settings-dialog";
import { useTelemetryVariants } from "@/features/device/use-telemetry-variant-options";
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
  const [settingsDevice, setSettingsDevice] = useState<DeviceRow | null>(null);
  const { me, isOperator, isSuperuser, meId, ownerName } = useOwnerDirectory();
  const meshes = useQuery(meshRepository.list());
  const meshOptions = useMemo(
    () => (meshes.data ?? []).map((mesh) => ({ value: mesh.id, label: meshTitle(mesh) })),
    [meshes.data],
  );
  const { options: variantOptions } = useTelemetryVariants();
  const specs = useMemo(
    () =>
      deviceFilterSpecs({
        formatMessage,
        variantOptions,
        meshOptions,
        mesh: true,
        allowed: true,
        blueprint: true,
        archive: isOperator,
      }),
    [meshOptions, variantOptions, formatMessage, isOperator],
  );
  const filters = useSmartFilters({ specs });
  const devices = useQuery(deviceRepository.list(deviceListParams(filters.serverQueryString)));
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
  const shownRows = rows.filter((row) => matchesListQuery((field) => deviceFilterValue(row, field), filters.queryString));
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
            className="rounded-full outline-hidden hover:text-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
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
            <span className="whitespace-nowrap text-text-secondary tabular-nums" title={seen ? formatWhen(seen) : undefined}>
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
      <ListScaffold
        title={formatMessage({ id: "page.devices.list.title", defaultMessage: "Devices" })}
        panelTitle={formatMessage({ id: "page.devices.list.inventory.title", defaultMessage: "Inventory" })}
        panelDescription={
          devices.isPending
            ? formatMessage({ id: "page.devices.list.inventory.loading", defaultMessage: "Loading devices." })
            : devices.error
              ? formatMessage({
                  id: "page.devices.list.inventory.error",
                  defaultMessage: "Devices didn't load. Check your connection to the API and try again.",
                })
              : formatMessage({
                  id: "page.devices.list.inventory.description",
                  defaultMessage: "Filter, then open a device for readings.",
                })
        }
        toolbar={
          <div className="mb-4">
            <SmartFilterToolbar filters={filters} />
          </div>
        }
        pending={devices.isPending}
        failed={Boolean(devices.error)}
      >
        <DataTable
          data={shownRows}
          columns={columns}
          getRowId={(row) => row.uuid}
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
      </ListScaffold>
      {settingsDevice ? (
        <DeviceSettingsDialog device={settingsDevice} open onClose={() => setSettingsDevice(null)} />
      ) : null}
    </>
  );
}
