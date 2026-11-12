import type { DeviceRead } from "@mtt/contracts";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { DataTable } from "@mtt/ui/components/data-table";
import { ListScaffold } from "@/components/list-scaffold";
import { useMe } from "@/features/auth/use-me";
import { SmartFilterToolbar } from "@/components/smart-filters";
import { deviceListParams, filterDevices, useDeviceFilters } from "@/features/device/device-filter";
import { deviceRepository } from "@/features/device/repository";
import { useDeviceColumns } from "@/features/device/ui/use-device-columns";
import { DeviceSettingsDialog } from "@/features/device/ui/settings-dialog";
import { meshTitle } from "@/features/mesh/model";
import { useMeshDirectory } from "@/features/mesh/use-mesh-directory";

export function DevicesPage(): ReactElement {
  const { formatMessage } = useIntl();
  const [settingsDevice, setSettingsDevice] = useState<DeviceRead | null>(null);
  const { isOperator } = useMe();
  const { query: meshes, byId: meshById, showOwner } = useMeshDirectory();
  const meshOptions = useMemo(
    () => (meshes.data ?? []).map((mesh) => ({ value: mesh.id, label: meshTitle(mesh) })),
    [meshes.data],
  );
  const filters = useDeviceFilters({ meshOptions, allowed: true, blueprint: true, archive: isOperator });
  const devices = useQuery(deviceRepository.list(deviceListParams(filters.serverQueryString)));
  const shownRows = filterDevices(devices.data ?? [], filters);
  const columns = useDeviceColumns({
    meshes: meshById,
    withMesh: true,
    withOwner: showOwner((devices.data ?? []).map((device) => meshById.get(device.mesh_id)?.owner_id)),
    onSettings: setSettingsDevice,
  });

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
