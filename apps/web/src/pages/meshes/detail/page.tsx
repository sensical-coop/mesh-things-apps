import type { DeviceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { cx } from "@mtt/ui/utils";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { RiAddLine, RiCollapseDiagonalLine, RiDeleteBinLine, RiExpandDiagonalLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useMemo, useState } from "react";
import { Link, notFound, useNavigate, useParams } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@mtt/ui/components/ui/tabs";
import { Map, MapControls, MapMarker, MarkerContent } from "@mtt/ui/components/ui/map";
import { DataTable } from "@mtt/ui/components/data-table";
import { SmartFilterToolbar } from "@/components/smart-filters";
import { useMe } from "@/features/auth/use-me";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { FitToPoints } from "@/features/device/ui/map-fit";
import { DeviceMapLegend } from "@/features/device/ui/map-legend";
import { DeviceMapPin } from "@/features/device/ui/map-pin";
import { filterDevices, useDeviceFilters } from "@/features/device/device-filter";
import { devicePosition, deviceTitle } from "@/features/device/model";
import { useDeviceColumns } from "@/features/device/ui/use-device-columns";
import { DeviceSettingsDialog } from "@/features/device/ui/settings-dialog";
import { isNotFoundError } from "@/lib/not-found";
import { routes } from "@/router";
import { expandedMapClass } from "@/features/mesh-network/expanded-map";
import { SettingsButton } from "@/components/settings-button";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { meshRepository } from "@/features/mesh/repository";
import { canEditMesh, meshTermsStanding, meshTitle } from "@/features/mesh/model";
import { MeshStatusChip } from "@/features/mesh/ui/mesh-status-chip";
import { DeleteMeshDialog } from "@/features/mesh/ui/delete-mesh-dialog";
import { EditMeshDialog } from "@/features/mesh/ui/edit-mesh-dialog";
import { MeshAccessBadge } from "@/features/mesh/ui/mesh-access-badge";
import { MeshSourceLabel } from "@/features/mesh/ui/mesh-source-label";
import { DetailHeading } from "@/components/detail-heading";
import { MeshProtocolChip } from "@/features/mesh/ui/mesh-protocol-chip";
import { MeshProtocolNotice } from "@/features/mesh/ui/mesh-protocol-notice";
import { MeshTermsNotice } from "@/features/mesh/ui/mesh-terms-notice";
import { useMeshTerms } from "@/features/terms/use-mesh-terms";
import { useMeshStatus } from "@/features/mesh/use-mesh-status";
import { PskReveal } from "./psk-reveal";
import { RegisterDeviceDialog } from "@/features/device/ui/register-device-dialog";
import { sourceRepository } from "@/features/source/repository";
import { MapUnsupported } from "@/components/map-unsupported";
import { canArchiveDevice } from "@/features/archive/model";
import { ArchiveButton } from "@/features/archive/ui/archive-button";
import { MeshTopologyTab } from "@/features/mesh-network/ui/topology-tab";
import { MeshTrafficTab } from "@/features/mesh-network/ui/traffic-tab";

const MESH_TABS = ["overview", "traffic", "topology"] as const;

export function MeshDetailPage(): ReactElement {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { meshId } = useParams({ from: routes.mesh });
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(MESH_TABS).withDefault("overview"));
  // Its own key, so the Topology tab's larger view does not enlarge this one too.
  const [fleetSize, setFleetSize] = useQueryState("fleet", parseAsString);
  const fleetLarge = fleetSize === "large";
  const mesh = useQuery(meshRepository.retrieve(meshId));
  if (isNotFoundError(mesh.error)) throw notFound();
  const devices = useQuery(meshRepository.devices(meshId));
  const { me, isOperator } = useMe();
  const { ownerName } = useOwnerDirectory();
  const sources = useQuery({ ...sourceRepository.list(), enabled: isOperator });
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [settingsDevice, setSettingsDevice] = useState<DeviceRead | null>(null);
  // Someone else's public mesh is read-only: every write affordance hangs off this.
  const canEdit = mesh.data != null && canEditMesh(mesh.data, me);
  // A self-hosted instance asks for no terms: no chip, no notice.
  const { enforced: termsEnforced, current: currentTerms } = useMeshTerms();
  const statusOf = useMeshStatus(sources.data ?? []);
  const termsStanding =
    termsEnforced && mesh.data ? meshTermsStanding(mesh.data, currentTerms?.version, new Date()) : null;
  const meshState = mesh.data ? statusOf(mesh.data) : null;

  const plotted = useMemo(
    () =>
      (devices.data ?? []).flatMap((device) => {
        const position = devicePosition(device);
        return position ? [{ device, lng: position[0], lat: position[1] }] : [];
      }),
    [devices.data],
  );

  // Same keys as the devices list, so a filtered URL reads the same on both pages.
  const filters = useDeviceFilters({ allowed: true });
  const shownDevices = filterDevices(devices.data ?? [], filters);

  const meshes = useMemo(
    () => new globalThis.Map(mesh.data ? [[mesh.data.id, mesh.data]] : []),
    [mesh.data],
  );
  const columns = useDeviceColumns({ meshes, withMesh: false, withOwner: false, onSettings: setSettingsDevice });
  return (
    <>
      <DetailHeading
        crumb={
          <Link to={routes.meshes}>
            {formatMessage({ id: "page.meshes.detail.breadcrumb", defaultMessage: "Meshes" })}
          </Link>
        }
        title={
          mesh.data
            ? meshTitle(mesh.data)
            : formatMessage({ id: "page.meshes.detail.fallbackTitle", defaultMessage: "Mesh" })
        }
        badges={
          <>
            {mesh.data ? <MeshAccessBadge mesh={mesh.data} /> : null}
            {mesh.data ? <MeshProtocolChip mesh={mesh.data} /> : null}
            {/* Only a bridged mesh says so; the default broker is the norm. */}
            {mesh.data?.source_id ? <MeshSourceLabel mesh={mesh.data} sources={sources.data ?? []} /> : null}
            {meshState && meshState.kind !== "hidden" ? <MeshStatusChip status={meshState} /> : null}
          </>
        }
        note={
          mesh.data && me && mesh.data.owner_id !== me.id ? (
            <p className="text-caption-1-regular text-text-secondary">
              {formatMessage(
                { id: "page.meshes.detail.ownedBy", defaultMessage: "Owned by {name}" },
                { name: ownerName(mesh.data.owner_id) },
              )}
            </p>
          ) : null
        }
        actions={
          canEdit ? (
            <>
              <Button type="button" size="small" leadingIcon={RiAddLine} onClick={() => setOpen(true)}>
                {formatMessage({ id: "page.meshes.detail.registerGateway", defaultMessage: "Register gateway" })}
              </Button>
              <SettingsButton
                size="small"
                label={formatMessage({ id: "feature.mesh.actions.edit", defaultMessage: "Edit mesh" })}
                onClick={() => setEditOpen(true)}
              />
              <Button
                type="button"
                size="small"
                variant="danger"
                iconOnly
                leadingIcon={RiDeleteBinLine}
                aria-label={formatMessage({ id: "feature.mesh.actions.delete", defaultMessage: "Delete mesh" })}
                title={formatMessage({ id: "feature.mesh.actions.delete", defaultMessage: "Delete mesh" })}
                onClick={() => setDeleteOpen(true)}
              />
            </>
          ) : null
        }
      />
      {mesh.data && termsStanding ? (
        <MeshTermsNotice
          mesh={mesh.data}
          standing={termsStanding}
          canRenew={me !== undefined && mesh.data.owner_id === me.id}
        />
      ) : null}
      {mesh.data ? (
        <MeshProtocolNotice
          mesh={mesh.data}
          mismatched={(devices.data ?? []).filter((device) => device.protocol_mismatch).length}
          onChange={canEdit ? () => setEditOpen(true) : undefined}
        />
      ) : null}
      <Tabs
        className="flex flex-col gap-0"
        value={tab}
        onValueChange={(value) => {
          const next = MESH_TABS.find((tabValue) => tabValue === value);
          if (next) void setTab(next);
        }}
      >
        <TabsList className="p-1">
          <TabsTrigger value="overview" className="px-4 py-1.5 text-body-medium">
            {formatMessage({ id: "page.meshes.detail.tabs.overview", defaultMessage: "Overview" })}
          </TabsTrigger>
          <TabsTrigger value="traffic" className="px-4 py-1.5 text-body-medium">
            {formatMessage({ id: "page.meshes.detail.tabs.traffic", defaultMessage: "Traffic" })}
          </TabsTrigger>
          <TabsTrigger value="topology" className="px-4 py-1.5 text-body-medium">
            {formatMessage({ id: "page.meshes.detail.tabs.topology", defaultMessage: "Topology" })}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" keepMounted className="mt-6 flex flex-col gap-6">
          <Frame className="shadow-card">
            <FrameHeader>
              <FrameTitle>
                <span>{formatMessage({ id: "page.meshes.detail.psk.title", defaultMessage: "Channel ID" })}</span>
                {mesh.data ? (
                  <code className="rounded-md bg-background-secondary-default px-1.5 py-0.5 font-mono text-body-2-regular text-text-primary">
                    {mesh.data.channel_id}
                  </code>
                ) : null}
              </FrameTitle>
              <FrameDescription>
                {formatMessage({
                  id: "page.meshes.detail.psk.description",
                  defaultMessage: "Mesh PSK.",
                })}
              </FrameDescription>
            </FrameHeader>
            <FramePanel>
              {mesh.isPending ? <SkeletonRows rows={1} /> : null}
              {mesh.error ? (
                <StatusCopy>
                  {formatMessage({
                    id: "page.meshes.detail.psk.error",
                    defaultMessage: "This mesh is not in the inventory, or the API is unreachable.",
                  })}
                </StatusCopy>
              ) : null}
              {mesh.data ? (
                mesh.data.psk_b64 ? (
                  <PskReveal value={mesh.data.psk_b64} />
                ) : (
                  <StatusCopy>
                    {formatMessage({
                      id: "page.meshes.detail.psk.notVisible",
                      defaultMessage: "The pre-shared key isn't visible for this mesh.",
                    })}
                  </StatusCopy>
                )
              ) : null}
            </FramePanel>
          </Frame>
          <Frame className="shadow-card">
            <FrameHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <FrameTitle>
                    {formatMessage({ id: "page.meshes.detail.fleet.title", defaultMessage: "Fleet" })}
                  </FrameTitle>
                  <FrameDescription>
                    {plotted.length
                      ? formatMessage({
                          id: "page.meshes.detail.fleet.hasCoords",
                          defaultMessage: "Devices with coordinates.",
                        })
                      : formatMessage({
                          id: "page.meshes.detail.fleet.noCoords",
                          defaultMessage: "No coordinates on this mesh yet.",
                        })}
                  </FrameDescription>
                </div>
                {plotted.length ? (
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    className="shrink-0 self-start"
                    leadingIcon={fleetLarge ? RiCollapseDiagonalLine : RiExpandDiagonalLine}
                    onClick={() => void setFleetSize(fleetLarge ? null : "large")}
                  >
                    {fleetLarge
                      ? formatMessage({ id: "page.meshes.detail.network.links.smaller", defaultMessage: "Smaller view" })
                      : formatMessage({ id: "page.meshes.detail.network.links.larger", defaultMessage: "Larger view" })}
                  </Button>
                ) : null}
              </div>
            </FrameHeader>
            <FramePanel>
              {plotted.length ? (
                <div
                  // Remounts the map at the new height rather than leaving MapLibre at the old one.
                  key={fleetLarge ? "large" : "small"}
                  className={cx(
                    "relative oa-arrive overflow-hidden oa-squircle-inset",
                    fleetLarge ? expandedMapClass : "h-80",
                  )}
                >
                  <DeviceMapLegend />
                  <Map
                    center={[plotted[0]!.lng, plotted[0]!.lat]}
                    zoom={12}
                    unsupported={<MapUnsupported />}
                    className="size-full "
                  >
                    <MapControls />
                    <FitToPoints points={plotted} />
                    {plotted.map(({ device, lng, lat }) => (
                      <MapMarker key={device.uuid} longitude={lng} latitude={lat}>
                        <MarkerContent>
                          <DeviceMapPin
                            isGateway={device.is_gateway}
                            label={deviceTitle(device)}
                            deviceUuid={device.uuid}
                          />
                        </MarkerContent>
                      </MapMarker>
                    ))}
                  </Map>
                </div>
              ) : (
                !devices.isPending && (
                  <StatusCopy>
                    {formatMessage({
                      id: "page.meshes.detail.fleet.noneToPlot",
                      defaultMessage: "Register coordinates on a device to plot the mesh.",
                    })}
                  </StatusCopy>
                )
              )}
            </FramePanel>
          </Frame>
          <Frame className="shadow-card">
            <FrameHeader>
              <FrameTitle>{formatMessage({ id: "page.meshes.detail.devices.title", defaultMessage: "Devices" })}</FrameTitle>
              <FrameDescription>
                {devices.isPending
                  ? formatMessage({
                      id: "page.meshes.detail.devices.loading",
                      defaultMessage: "Loading devices on this mesh.",
                    })
                  : devices.data?.length && filters.active
                    ? formatMessage(
                        {
                          id: "page.meshes.detail.devices.filteredCount",
                          defaultMessage: "{shown, number} of {total, plural, one {# device} other {# devices}} match.",
                        },
                        { shown: shownDevices.length, total: devices.data.length },
                      )
                    : devices.data?.length
                      ? formatMessage(
                          {
                            id: "page.meshes.detail.devices.count",
                            defaultMessage:
                              "{total, plural, one {# device} other {# devices}} on this channel: {gateways, plural, one {# gateway} other {# gateways}} and {nodes, plural, one {# node} other {# nodes}}.",
                          },
                          {
                            total: devices.data.length,
                            gateways: devices.data.filter((d) => d.is_gateway).length,
                            nodes: devices.data.filter((d) => !d.is_gateway).length,
                          },
                        )
                      : formatMessage({
                          id: "page.meshes.detail.devices.none",
                          defaultMessage: "No devices registered on this mesh.",
                        })}
              </FrameDescription>
            </FrameHeader>
            <FramePanel>
              {devices.data?.length ? (
                <div className="mb-4">
                  <SmartFilterToolbar filters={filters} />
                </div>
              ) : null}
              {devices.isPending ? <SkeletonRows /> : null}
              {devices.data?.length ? (
                <DataTable
                  data={shownDevices}
                  columns={columns}
                  getRowId={(row) => row.uuid}
                  empty={formatMessage({
                    id: "page.meshes.detail.devices.noMatch",
                    defaultMessage: "No devices on this mesh match these filters.",
                  })}
                />
              ) : null}
              {devices.data && devices.data.length === 0 ? (
                <StatusCopy>
                  {canEdit
                    ? formatMessage({
                        id: "page.meshes.detail.devices.registerHint",
                        defaultMessage: "Register a node or gateway to start decoding traffic.",
                      })
                    : formatMessage({
                        id: "page.meshes.detail.devices.empty",
                        defaultMessage: "No devices on this mesh yet.",
                      })}
                </StatusCopy>
              ) : null}
            </FramePanel>
          </Frame>
        </TabsContent>
        <TabsContent value="traffic" className="mt-6">
          <MeshTrafficTab meshId={meshId} devices={devices.data ?? []} />
        </TabsContent>
        <TabsContent value="topology" className="mt-6">
          <MeshTopologyTab meshId={meshId} devices={devices.data ?? []} />
        </TabsContent>
      </Tabs>
      {mesh.data && canEdit ? (
        <RegisterDeviceDialog meshId={mesh.data.id} open={open} onClose={() => setOpen(false)} />
      ) : null}
      {mesh.data && canEdit ? (
        <EditMeshDialog mesh={mesh.data} open={editOpen} onClose={() => setEditOpen(false)} />
      ) : null}
      <DeleteMeshDialog
        mesh={deleteOpen ? (mesh.data ?? null) : null}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => void navigate({ to: routes.meshes })}
      />
      {settingsDevice ? (
        <DeviceSettingsDialog
          device={settingsDevice}
          open
          onClose={() => setSettingsDevice(null)}
        />
      ) : null}
    </>
  );
}
