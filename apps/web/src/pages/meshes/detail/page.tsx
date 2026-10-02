import type { DeviceRead } from "@mtt/contracts";
import { zDevicesCreateData } from "@mtt/contracts/zod";
import { Button, ButtonLink } from "@mtt/ui/components/base/buttons/button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { RiAddLine, RiDeleteBinLine, RiEyeLine, RiEyeOffLine, RiFileCopyLine, RiShareLine } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { Map, MapControls, MapMarker, MarkerContent } from "@mtt/ui/components/ui/map";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { FormField } from "@/components/form/form-field";
import { FormNumber } from "@/components/form/form-number";
import { Input } from "@mtt/ui/components/ui/input";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { DeviceAllowedBadge } from "@/features/device/ui/allowed-badge";
import { DeviceKindBadge } from "@/features/device/ui/kind-badge";
import { FitToPoints } from "@/features/device/ui/map-fit";
import { DeviceMapLegend } from "@/features/device/ui/map-legend";
import { DeviceMapPin } from "@/features/device/ui/map-pin";
import { DeviceSilentBadge } from "@/features/device/ui/silent-badge";
import { deviceRepository } from "@/features/device/repository";
import { deviceTitle } from "@/features/device/model";
import { DeviceSettingsDialog } from "@/features/device/ui/settings-dialog";
import { useFormatters } from "@/hooks/use-formatters";
import { href, routes } from "@/router";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { pageHeadingClass } from "@/lib/page-heading";
import { Modal } from "@/components/modal";
import { SettingsButton } from "@/components/settings-button";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { formLevelMessage, issueErrors, readApiError } from "@/lib/api-errors";
import { meshRepository } from "@/features/mesh/repository";
import { canEditMesh, meshStatus, meshTermsStanding, meshTitle } from "@/features/mesh/model";
import { MeshStatusChip } from "@/features/mesh/ui/mesh-status-chip";
import { DeleteMeshDialog } from "@/features/mesh/ui/delete-mesh-dialog";
import { EditMeshDialog } from "@/features/mesh/ui/edit-mesh-dialog";
import { MeshAccessBadge } from "@/features/mesh/ui/mesh-access-badge";
import { MeshViewersFrame } from "@/features/mesh/ui/mesh-viewers-frame";
import { ShareMeshDialog } from "@/features/mesh/ui/share-mesh-dialog";
import { MeshSourceLabel } from "@/features/mesh/ui/mesh-source-label";
import { MeshTermsNotice } from "@/features/mesh/ui/mesh-terms-notice";
import { termsLocale } from "@/features/terms/model";
import { termsRepository } from "@/features/terms/repository";
import { useTermsEnforced } from "@/features/terms/use-terms-enforced";
import { sourceRepository } from "@/features/source/repository";

export function MeshDetailPage(): ReactElement {
  const { formatMessage, locale } = useIntl();
  const { formatLastSeen } = useFormatters();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { meshId } = useParams({ from: routes.mesh });
  const mesh = useQuery(meshRepository.retrieve({ path: { mesh_id: meshId } }));
  const devices = useQuery(meshRepository.devices({ path: { mesh_id: meshId } }));
  const { me, owners, isOperator, ownerName } = useOwnerDirectory();
  const sources = useQuery({ ...sourceRepository.list(), enabled: isOperator });
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [settingsDevice, setSettingsDevice] = useState<DeviceRead | null>(null);
  // Public and shared meshes are read-only: every write affordance hangs off this.
  const canEdit = mesh.data != null && canEditMesh(mesh.data, me);
  const viewers = useQuery({ ...meshRepository.viewers({ path: { mesh_id: meshId } }), enabled: canEdit });
  // A self-hosted instance asks for no terms: no chip, no notice.
  const termsEnforced = useTermsEnforced() === true;
  const meshTerms = useQuery({
    ...termsRepository.mesh({ query: { locale: termsLocale(locale) } }),
    enabled: termsEnforced,
  });
  const termsStanding =
    termsEnforced && mesh.data ? meshTermsStanding(mesh.data, meshTerms.data?.version, new Date()) : null;
  const meshState = mesh.data
    ? meshStatus(mesh.data, {
        termsEnforced,
        currentTermsVersion: meshTerms.data?.version,
        sourceStatus: mesh.data.source_id
          ? sources.data?.find((source) => source.id === mesh.data.source_id)?.status
          : undefined,
        now: new Date(),
      })
    : null;

  const plotted = useMemo(
    () => (devices.data ?? []).filter((d) => d.latitude != null && d.longitude != null),
    [devices.data],
  );

  return (
    <>
      <div className={pageHeadingClass}>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-caption-1-regular text-text-secondary">
            <Link to={routes.meshes} className="hover:text-text-primary">
              {formatMessage({ id: "page.meshes.detail.breadcrumb", defaultMessage: "Meshes" })}
            </Link>
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-words text-title-2-medium tracking-tight text-text-primary">
              {mesh.data
                ? meshTitle(mesh.data)
                : formatMessage({ id: "page.meshes.detail.fallbackTitle", defaultMessage: "Mesh" })}
            </h1>
            {mesh.data ? <MeshAccessBadge mesh={mesh.data} canEdit={canEdit} /> : null}
            {/* Only a bridged mesh says so; the default broker is the norm. */}
            {mesh.data?.source_id ? <MeshSourceLabel mesh={mesh.data} sources={sources.data ?? []} /> : null}
            {meshState && meshState.kind !== "hidden" ? <MeshStatusChip status={meshState} /> : null}
          </div>
          {mesh.data && me && mesh.data.owner_id !== me.id ? (
            <p className="text-caption-1-regular text-text-secondary">
              {formatMessage(
                { id: "page.meshes.detail.ownedBy", defaultMessage: "Owned by {name}" },
                { name: ownerName(mesh.data.owner_id) },
              )}
            </p>
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2">
            <Button type="button" size="small" leadingIcon={RiAddLine} onClick={() => setOpen(true)}>
              {formatMessage({ id: "page.meshes.detail.registerGateway", defaultMessage: "Register gateway" })}
            </Button>
            {/* A public mesh is already readable by everyone, so there's nobody to invite. */}
            {mesh.data?.is_public ? null : (
              <Button
                type="button"
                variant="secondary"
                size="small"
                leadingIcon={RiShareLine}
                onClick={() => setShareOpen(true)}
              >
                {formatMessage({ id: "page.meshes.detail.share", defaultMessage: "Share" })}
              </Button>
            )}
            <SettingsButton
              size="small"
              label={formatMessage({ id: "page.meshes.list.edit", defaultMessage: "Edit mesh" })}
              onClick={() => setEditOpen(true)}
            />
            <Button
              type="button"
              size="small"
              variant="danger"
              iconOnly
              leadingIcon={RiDeleteBinLine}
              aria-label={formatMessage({ id: "page.meshes.list.delete", defaultMessage: "Delete mesh" })}
              title={formatMessage({ id: "page.meshes.list.delete", defaultMessage: "Delete mesh" })}
              onClick={() => setDeleteOpen(true)}
            />
          </div>
        ) : null}
      </div>
      {mesh.data && termsStanding ? (
        <MeshTermsNotice
          mesh={mesh.data}
          standing={termsStanding}
          canRenew={me !== undefined && mesh.data.owner_id === me.id}
        />
      ) : null}
      <div className="flex flex-col gap-6">
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
            <FrameTitle>{formatMessage({ id: "page.meshes.detail.fleet.title", defaultMessage: "Fleet" })}</FrameTitle>
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
          </FrameHeader>
          <FramePanel>
            {plotted.length ? (
              <div className="oa-arrive oa-squircle-inset relative h-80 overflow-hidden">
                <DeviceMapLegend />
                <Map
                  center={[plotted[0]!.longitude!, plotted[0]!.latitude!]}
                  zoom={12}
                  className="h-full min-h-80 w-full"
                >
                  <MapControls />
                  <FitToPoints points={plotted.map((device) => ({ lng: device.longitude!, lat: device.latitude! }))} />
                  {plotted.map((device) => (
                    <MapMarker key={device.uuid} longitude={device.longitude!} latitude={device.latitude!}>
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
                : devices.data?.length
                  ? formatMessage({
                      id: "page.meshes.detail.devices.description",
                      defaultMessage: "Gateways and nodes share this channel.",
                    })
                  : formatMessage({
                      id: "page.meshes.detail.devices.none",
                      defaultMessage: "No devices registered on this mesh.",
                    })}
            </FrameDescription>
          </FrameHeader>
          <FramePanel>
            {devices.isPending ? <SkeletonRows /> : null}
            {devices.data?.length ? (
              <div className="oa-arrive overflow-x-auto">
                <table className="w-full min-w-[40rem] caption-bottom text-left text-body-2-regular">
                  <thead>
                    <tr>
                      <th className="h-8 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                        {formatMessage({ id: "page.meshes.detail.devices.columns.device", defaultMessage: "Device" })}
                      </th>
                      <th className="h-8 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                        {formatMessage({ id: "page.meshes.detail.devices.columns.role", defaultMessage: "Role" })}
                      </th>
                      <th className="h-8 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                        {formatMessage({ id: "page.meshes.detail.devices.columns.allowed", defaultMessage: "Allowed" })}
                      </th>
                      <th className="h-8 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                        {formatMessage({ id: "page.meshes.detail.devices.columns.radio", defaultMessage: "Radio" })}
                      </th>
                      <th className="h-8 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                        {formatMessage({
                          id: "page.meshes.detail.devices.columns.lastSeen",
                          defaultMessage: "Last seen",
                        })}
                      </th>
                      <th className="h-8 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                        {formatMessage({
                          id: "page.meshes.detail.devices.columns.actions",
                          defaultMessage: "Actions",
                        })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.data.map((device) => (
                      <tr
                        key={device.uuid}
                        className="text-text-primary hover:bg-background-primary-hover"
                      >
                        <td className="h-8 px-3.5 py-0 align-middle whitespace-nowrap">
                          <Link
                            to={routes.device}
                            params={{ deviceUuid: device.uuid }}
                            className="rounded-full outline-none hover:text-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                          >
                            {deviceTitle(device)}
                          </Link>
                        </td>
                        <td className="h-8 px-3.5 py-0 align-middle whitespace-nowrap">
                          <DeviceKindBadge isGateway={device.is_gateway} />
                        </td>
                        <td className="h-8 px-3.5 py-0 align-middle whitespace-nowrap">
                          <DeviceAllowedBadge allowed={device.is_allowed} />
                        </td>
                        <td className="h-8 px-3.5 py-0 align-middle whitespace-nowrap">
                          <DeviceSilentBadge device={device} />
                        </td>
                        <td className="h-8 px-3.5 py-0 align-middle whitespace-nowrap tabular-nums text-text-secondary">
                          {formatLastSeen(device.last_seen)}
                        </td>
                        <td className="h-8 px-3.5 py-0 align-middle whitespace-nowrap">
                          <div className="flex justify-start gap-2">
                            <ButtonLink
                              href={href(routes.device, { deviceUuid: device.uuid })}
                              size="xs"
                              variant="secondary"
                            >
                              {formatMessage({ id: "page.devices.list.open", defaultMessage: "Open" })}
                            </ButtonLink>
                            {canEdit ? (
                              <SettingsButton
                                label={formatMessage({ id: "page.devices.detail.editSettings", defaultMessage: "Edit settings" })}
                                onClick={() => setSettingsDevice(device)}
                              />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
        {mesh.data && canEdit ? <MeshViewersFrame mesh={mesh.data} /> : null}
      </div>
      {mesh.data && canEdit ? (
        <RegisterDeviceDialog meshId={mesh.data.id} open={open} onClose={() => setOpen(false)} />
      ) : null}
      {mesh.data && canEdit ? (
        <EditMeshDialog mesh={mesh.data} open={editOpen} onClose={() => setEditOpen(false)} />
      ) : null}
      {mesh.data && canEdit ? (
        <ShareMeshDialog
          mesh={mesh.data}
          owners={owners}
          viewers={viewers.data ?? []}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
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
          onSaved={() =>
            queryClient.invalidateQueries({ queryKey: meshRepository.devicesKey({ path: { mesh_id: meshId } }) })
          }
        />
      ) : null}
    </>
  );
}

function RegisterDeviceDialog({
  meshId,
  open,
  onClose,
}: {
  meshId: string;
  open: boolean;
  onClose: () => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useMutation({
    ...deviceRepository.create(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: deviceRepository.listKey() });
      await queryClient.invalidateQueries({
        queryKey: meshRepository.devicesKey({ path: { mesh_id: meshId } }),
      });
      onClose();
    },
    onError: (error) => setErrors(readApiError(error).fields),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const label = String(form.get("label") ?? "").trim();
    const parsed = zDevicesCreateData.safeParse({
      body: {
        mesh_id: meshId,
        node_id: Number(form.get("node_id")),
        is_gateway: true,
        label: label === "" ? null : label,
      },
    });
    if (!parsed.success) {
      setErrors(issueErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    create.mutate({ body: parsed.data.body });
  }

  return (
    <Modal
      open={open}
      title={formatMessage({ id: "page.meshes.detail.registerGatewayDialog.title", defaultMessage: "Register gateway" })}
      description={formatMessage({
        id: "page.meshes.detail.registerGatewayDialog.description",
        defaultMessage: "A registered gateway authorizes its traffic to be decoded.",
      })}
      onClose={onClose}
    >
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
          <FormField
            id="device-label"
            label={formatMessage({ id: "page.meshes.detail.registerGatewayDialog.label", defaultMessage: "Label" })}
            error={errors.label}
          >
            <Input id="device-label" name="label" autoComplete="off" />
          </FormField>
          <FormField
            id="device-node"
            label={formatMessage({ id: "page.meshes.detail.registerGatewayDialog.nodeId", defaultMessage: "Node ID" })}
            hint={formatMessage({
              id: "page.meshes.detail.registerGatewayDialog.nodeIdHint",
              defaultMessage:
                "The decimal node number (i.e. the version without '!'). Example: 2130636288.",
            })}
            error={errors.node_id}
          >
            <FormNumber id="device-node" name="node_id" min={0} max={4294967295} step={1} required />
          </FormField>
        </FieldGroup>
        {create.error ? (
          <StatusCopy>
            {formatMessage({
              id: "page.meshes.detail.registerGatewayDialog.error",
              defaultMessage: "Registration failed. Check node ID and try again.",
            })}
            {formLevelMessage(create.error) ? ` ${formLevelMessage(create.error)}` : ""}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "page.meshes.detail.registerGatewayDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" disabled={create.isPending}>
            {create.isPending
              ? formatMessage({
                  id: "page.meshes.detail.registerGatewayDialog.registering",
                  defaultMessage: "Registering gateway",
                })
              : formatMessage({
                  id: "page.meshes.detail.registerGatewayDialog.title",
                  defaultMessage: "Register gateway",
                })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PskReveal({ value }: { value: string }): ReactElement {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="oa-arrive flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <code className="min-w-0 break-all font-mono text-body-2-regular text-text-primary">
        {open ? value : "••••••••"}
      </code>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="secondary"
          size="small"
          leadingIcon={open ? RiEyeOffLine : RiEyeLine}
          onClick={() => setOpen((v) => !v)}
        >
          {open
            ? formatMessage({ id: "page.meshes.detail.psk.hide", defaultMessage: "Hide" })
            : formatMessage({ id: "page.meshes.detail.psk.show", defaultMessage: "Show" })}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="small"
          leadingIcon={RiFileCopyLine}
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => setCopied(true));
          }}
        >
          {copied
            ? formatMessage({ id: "page.meshes.detail.psk.copied", defaultMessage: "Copied" })
            : formatMessage({ id: "page.meshes.detail.psk.copy", defaultMessage: "Copy" })}
        </Button>
      </div>
    </div>
  );
}
