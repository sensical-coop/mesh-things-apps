import type { DeviceRead, Mesh } from "@mtt/contracts";
import { tableLinkClass } from "@/lib/link-class";
import { Link } from "@tanstack/react-router";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { useMemo } from "react";
import { useIntl } from "react-intl";
import { RouterButtonLink } from "@/components/router-button-link";
import { SettingsButton } from "@/components/settings-button";
import { canArchiveDevice } from "@/features/archive/model";
import { ArchiveButton } from "@/features/archive/ui/archive-button";
import { useMe } from "@/features/auth/use-me";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { deviceLastSeen, deviceTitle } from "@/features/device/model";
import { DeviceAllowedBadge } from "@/features/device/ui/allowed-badge";
import { DeviceKindBadge } from "@/features/device/ui/kind-badge";
import { DeviceSilentBadge } from "@/features/device/ui/silent-badge";
import { canEditMesh, meshTitle } from "@/features/mesh/model";
import { useFormatters } from "@/hooks/use-formatters";
import { routes } from "@/router";

const col = legacyCreateColumnHelper<DeviceRead>();

type DeviceColumnsInput = {
  /** The meshes the listed devices are on. Decides who may edit a device and shows the owner. */
  meshes: ReadonlyMap<string, Pick<Mesh, "channel_id" | "label" | "owner_id">>;
  withMesh: boolean;
  withOwner: boolean;
  onSettings: (device: DeviceRead) => void;
};

/** The devices table, as the devices list and a mesh's page show it. */
export function useDeviceColumns({ meshes, withMesh, withOwner, onSettings }: DeviceColumnsInput) {
  const { formatMessage } = useIntl();
  const { formatLastSeen, formatWhen, toRelative } = useFormatters();
  const { me } = useMe();
  const { ownerLabel } = useOwnerDirectory();

  return useMemo(() => {
    const ownerOf = (device: DeviceRead) => meshes.get(device.mesh_id)?.owner_id;
    return [
      col.accessor((row) => deviceTitle(row), {
        id: "device",
        header: formatMessage({ id: "feature.device.columns.device", defaultMessage: "Device" }),
        cell: (info) => (
          <Link
            to={routes.device}
            params={{ deviceUuid: info.row.original.uuid }}
            className={tableLinkClass}
          >
            {info.getValue()}
          </Link>
        ),
      }),
      ...(withMesh
        ? [
            col.accessor((row) => {
              const mesh = meshes.get(row.mesh_id);
              return mesh ? meshTitle(mesh) : row.mesh_id;
            }, {
              id: "mesh",
              header: formatMessage({ id: "feature.device.columns.mesh", defaultMessage: "Mesh" }),
              cell: (info) => <span className="text-text-secondary">{info.getValue()}</span>,
            }),
          ]
        : []),
      col.accessor("is_gateway", {
        header: formatMessage({ id: "feature.device.columns.role", defaultMessage: "Role" }),
        cell: (info) => <DeviceKindBadge isGateway={info.getValue()} />,
      }),
      col.accessor("is_allowed", {
        header: formatMessage({ id: "feature.device.columns.allowed", defaultMessage: "Allowed" }),
        cell: (info) => <DeviceAllowedBadge allowed={info.getValue()} />,
      }),
      col.display({
        id: "radio",
        header: formatMessage({ id: "feature.device.columns.radio", defaultMessage: "Radio" }),
        cell: (info) => <DeviceSilentBadge device={info.row.original} />,
      }),
      ...(withOwner
        ? [
            col.accessor((row) => ownerOf(row) ?? "", {
              id: "owner",
              header: formatMessage({ id: "feature.device.columns.owner", defaultMessage: "Owner" }),
              cell: (info) => <span className="text-text-secondary">{ownerLabel(info.getValue())}</span>,
            }),
          ]
        : []),
      col.accessor(deviceLastSeen, {
        id: "last_seen",
        header: formatMessage({ id: "feature.device.columns.lastSeen", defaultMessage: "Last seen" }),
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
        id: "actions",
        enableSorting: false,
        header: formatMessage({ id: "feature.device.columns.actions", defaultMessage: "Actions" }),
        cell: ({ row }) => {
          const ownerId = ownerOf(row.original);
          return (
            <div className="flex justify-start gap-2 whitespace-nowrap">
              <RouterButtonLink to={routes.device} params={{ deviceUuid: row.original.uuid }} size="xs" variant="secondary">
                {formatMessage({ id: "common.actions.open", defaultMessage: "Open" })}
              </RouterButtonLink>
              {ownerId !== undefined && canEditMesh({ owner_id: ownerId }, me) ? (
                <SettingsButton
                  label={formatMessage({ id: "common.actions.editSettings", defaultMessage: "Edit settings" })}
                  onClick={() => onSettings(row.original)}
                />
              ) : null}
              {canArchiveDevice(row.original, me, ownerId) ? <ArchiveButton device={row.original} /> : null}
            </div>
          );
        },
      }),
    ];
  }, [meshes, withMesh, withOwner, onSettings, formatMessage, formatLastSeen, formatWhen, toRelative, me, ownerLabel]);
}
