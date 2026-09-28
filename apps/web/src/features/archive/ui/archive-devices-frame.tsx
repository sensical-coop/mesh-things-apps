import type { DeviceRead } from "@mtt/contracts";
import { DataTable } from "@mtt/ui/components/data-table";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { Link } from "@tanstack/react-router";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { useFormatters } from "@/hooks/use-formatters";
import { ArchiveButton } from "@/features/archive/ui/archive-button";
import { deviceTitle } from "@/features/device/model";
import { DeviceKindBadge } from "@/features/device/ui/kind-badge";
import { routes } from "@/router";

export type ArchiveDevicesFrameProps = {
  meshTitle: string;
  devices: DeviceRead[] | undefined;
  pending: boolean;
  failed: boolean;
};

const col = legacyCreateColumnHelper<DeviceRead>();

/** Which of the mesh's devices are archived, each with its own switch. */
export function ArchiveDevicesFrame({ meshTitle, devices, pending, failed }: ArchiveDevicesFrameProps): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();

  const columns = useMemo(
    () => [
      col.accessor((row) => deviceTitle(row), {
        id: "device",
        header: formatMessage({ id: "feature.archive.devices.columns.device", defaultMessage: "Device" }),
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
      col.accessor("is_gateway", {
        header: formatMessage({ id: "feature.archive.devices.columns.role", defaultMessage: "Role" }),
        cell: (info) => <DeviceKindBadge isGateway={info.getValue()} />,
      }),
      // The button shows the state too (filled in the accent while on), so it is the column.
      col.accessor((row) => row.archive_enabled === true, {
        id: "archive",
        header: formatMessage({ id: "feature.archive.devices.columns.archive", defaultMessage: "S3 storage" }),
        cell: ({ row }) => <ArchiveButton device={row.original} />,
      }),
      col.accessor((row) => row.archive_enabled_at ?? "", {
        id: "since",
        header: formatMessage({ id: "feature.archive.devices.columns.since", defaultMessage: "Since" }),
        cell: (info) => (
          <span className="tabular-nums text-text-secondary">
            {info.row.original.archive_enabled_at
              ? formatWhen(info.row.original.archive_enabled_at)
              : formatMessage({ id: "common.format.emDash", defaultMessage: "—" })}
          </span>
        ),
      }),
    ],
    [formatMessage, formatWhen],
  );

  return (
    <Frame className="shadow-card">
      <FrameHeader>
        <FrameTitle>
          {formatMessage({ id: "feature.archive.devices.title", defaultMessage: "Devices on {mesh}" }, { mesh: meshTitle })}
        </FrameTitle>
        <FrameDescription>
          {formatMessage({
            id: "feature.archive.devices.description",
            defaultMessage:
              "Only the devices you switch on are stored in S3, from that moment on. Switching one off keeps what's already stored.",
          })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        {pending ? <SkeletonRows rows={3} /> : null}
        {failed ? (
          <StatusCopy>
            {formatMessage({
              id: "feature.archive.devices.error",
              defaultMessage: "Devices didn't load. Check your connection to the API and try again.",
            })}
          </StatusCopy>
        ) : null}
        {devices ? (
          <DataTable
            data={devices}
            columns={columns}
            getRowId={(row) => row.uuid}
            previousPageLabel={formatMessage({ id: "common.dataTable.previousPage", defaultMessage: "Previous page" })}
            nextPageLabel={formatMessage({ id: "common.dataTable.nextPage", defaultMessage: "Next page" })}
            pageRangeOfLabel={formatMessage({ id: "common.dataTable.of", defaultMessage: "of" })}
            empty={formatMessage({
              id: "feature.archive.devices.empty",
              defaultMessage: "No devices on this mesh yet.",
            })}
          />
        ) : null}
      </FramePanel>
    </Frame>
  );
}
