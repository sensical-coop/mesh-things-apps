import type { DeviceRead } from "@mtt/contracts";
import { devicesListOptions, meshesListOptions } from "@mtt/contracts/query";
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
import { DataTable } from "./components/data-table";
import { SmartFilterToolbar, useSmartFilters, type FilterSpec } from "./components/smart-filters";
import { deviceSilent, deviceTitle, formatLastSeen, meshTitle } from "./format";
import { listQuery } from "./lib/filter-url";
import { Flag, pageHeadingClass, SkeletonRows } from "./widgets";

type DeviceRow = DeviceRead & { meshLabel: string };

const col = legacyCreateColumnHelper<DeviceRow>();

export function DevicesPage(): ReactElement {
  const meshes = useQuery(meshesListOptions());
  const meshOptions = useMemo(
    () => (meshes.data ?? []).map((mesh) => ({ value: mesh.id, label: meshTitle(mesh) })),
    [meshes.data],
  );
  const specs = useMemo<FilterSpec[]>(
    () => [
      { key: "label", urlKey: "label", label: "Label", type: "text" },
      {
        key: "mesh_id",
        urlKey: "mesh_id",
        label: "Mesh",
        type: "select",
        options: meshOptions,
      },
      {
        key: "is_gateway",
        urlKey: "is_gateway",
        label: "Role",
        type: "select",
        options: [
          { value: "true", label: "Gateway" },
          { value: "false", label: "Node" },
        ],
      },
      {
        key: "is_allowed",
        urlKey: "is_allowed",
        label: "Allowed",
        type: "select",
        options: [
          { value: "true", label: "Allowed" },
          { value: "false", label: "Blocked" },
        ],
      },
      {
        key: "has_postprocessing",
        urlKey: "has_postprocessing",
        label: "Blueprint",
        type: "select",
        options: [
          { value: "true", label: "With blueprint" },
          { value: "false", label: "Without blueprint" },
        ],
      },
    ],
    [meshOptions],
  );
  const filters = useSmartFilters({ specs });
  const devices = useQuery(devicesListOptions({ query: listQuery(filters.queryString) }));
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
        header: "Device",
      }),
      col.accessor("meshLabel", {
        header: "Mesh",
        cell: (info) => <span className="text-text-secondary">{info.getValue()}</span>,
      }),
      col.accessor("is_gateway", {
        header: "Role",
        cell: (info) => <Flag on={info.getValue()} yes="Gateway" no="Node" />,
      }),
      col.accessor("is_allowed", {
        header: "Allowed",
        cell: (info) => <Flag on={info.getValue()} yes="Allowed" no="Blocked" onColor="lime" offColor="rose" />,
      }),
      col.accessor((row) => deviceSilent(row), {
        id: "radio",
        header: "Radio",
        cell: (info) => (
          <Flag on={!info.getValue()} yes="Live" no="Silent" onColor="lime" offColor="rose" />
        ),
      }),
      col.accessor("last_seen", {
        header: "Last seen",
        cell: (info) => (
          <span className="tabular-nums text-text-secondary">{formatLastSeen(info.getValue())}</span>
        ),
      }),
      col.display({
        id: "open",
        enableSorting: false,
        header: () => <span className="block text-end">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ButtonLink href={`/devices/${row.original.uuid}`} size="xs" variant="secondary">
              Open
            </ButtonLink>
          </div>
        ),
      }),
    ],
    [],
  );

  return (
    <>
      <div className={pageHeadingClass}>
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">Devices</h1>
      </div>
      <div className="flex flex-col gap-6">
        <Frame className="shadow-card">
          <FrameHeader>
            <FrameTitle>Inventory</FrameTitle>
            <FrameDescription>
              {devices.isPending
                ? "Loading devices."
                : devices.error
                  ? "Devices didn't load. Check that the mock is running on 8787."
                  : "Filter, then open a device for readings."}
            </FrameDescription>
          </FrameHeader>
          <FramePanel>
            <div className="mb-4">
              <SmartFilterToolbar filters={filters} />
            </div>
            {devices.isPending ? <SkeletonRows /> : null}
            {devices.error ? null : devices.isPending ? null : (
              <DataTable
                data={rows}
                columns={columns}
                getRowId={(row) => row.uuid}
                empty={
                  filters.active
                    ? "No devices match these filters."
                    : "No devices yet. Register a device from a mesh."
                }
              />
            )}
          </FramePanel>
        </Frame>
      </div>
    </>
  );
}
