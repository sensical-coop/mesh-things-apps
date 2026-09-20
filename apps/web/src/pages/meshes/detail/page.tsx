import { zDevicesCreateData } from "@mtt/contracts/zod";
import { Button } from "@mtt/ui/components/base/buttons/button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { RiAddLine, RiEyeLine, RiEyeOffLine, RiFileCopyLine } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { Map, MapControls, MapMarker, MarkerContent } from "@mtt/ui/components/ui/map";
import { Tooltip, TooltipContent, TooltipTrigger } from "@mtt/ui/components/ui/tooltip";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { FormCheckbox } from "@/components/form/form-checkbox";
import { FormField } from "@/components/form/form-field";
import { FormNumber } from "@/components/form/form-number";
import { Input } from "@mtt/ui/components/ui/input";
import { DeviceAllowedBadge } from "@/features/device/ui/allowed-badge";
import { DeviceKindBadge } from "@/features/device/ui/kind-badge";
import { DeviceSilentBadge } from "@/features/device/ui/silent-badge";
import { deviceRepository } from "@/features/device/repository";
import { deviceTitle } from "@/features/device/model";
import { useFormatters } from "@/hooks/use-formatters";
import { routes } from "@/router";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { pageHeadingClass } from "@/lib/page-heading";
import { Modal } from "@/components/modal";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";

export function MeshDetailPage(): ReactElement {
  const { formatMessage } = useIntl();
  const { formatLastSeen } = useFormatters();
  const { meshId } = useParams({ from: routes.mesh });
  const mesh = useQuery(meshRepository.retrieve({ path: { mesh_id: meshId } }));
  const devices = useQuery(meshRepository.devices({ path: { mesh_id: meshId } }));
  const [open, setOpen] = useState(false);

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
          <h1 className="min-w-0 break-words text-title-2-medium tracking-tight text-text-primary">
            {mesh.data
              ? meshTitle(mesh.data)
              : formatMessage({ id: "page.meshes.detail.fallbackTitle", defaultMessage: "Mesh" })}
          </h1>
        </div>
        <Button type="button" size="small" leadingIcon={RiAddLine} onClick={() => setOpen(true)}>
          {formatMessage({ id: "page.meshes.detail.registerDevice", defaultMessage: "Register device" })}
        </Button>
      </div>
      <div className="flex flex-col gap-6">
        <Frame className="shadow-card">
          <FrameHeader>
            <FrameTitle>{formatMessage({ id: "page.meshes.detail.psk.title", defaultMessage: "Pre-shared key" })}</FrameTitle>
            <FrameDescription>
              {formatMessage({
                id: "page.meshes.detail.psk.description",
                defaultMessage: "Visible only on this mesh. Copy it; do not put it in a URL.",
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
              <div className="oa-arrive oa-squircle-inset h-80 overflow-hidden">
                <Map
                  center={[plotted[0]!.longitude!, plotted[0]!.latitude!]}
                  zoom={12}
                  className="h-full min-h-80 w-full"
                >
                  <MapControls />
                  {plotted.map((device) => (
                    <MapMarker key={device.uuid} longitude={device.longitude!} latitude={device.latitude!}>
                      <MarkerContent>
                        <Tooltip>
                          <TooltipTrigger
                            delay={0}
                            aria-label={deviceTitle(device)}
                            className="relative flex size-5 items-center justify-center rounded-full bg-transparent p-0"
                          >
                            <span className="relative size-2.5 rounded-full bg-accent-500 ring-2 ring-background-primary-default" aria-hidden />
                          </TooltipTrigger>
                          <TooltipContent sideOffset={8}>{deviceTitle(device)}</TooltipContent>
                        </Tooltip>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {devices.data && devices.data.length === 0 ? (
              <StatusCopy>
                {formatMessage({
                  id: "page.meshes.detail.devices.registerHint",
                  defaultMessage: "Register a node or gateway to start decoding traffic.",
                })}
              </StatusCopy>
            ) : null}
          </FramePanel>
        </Frame>
      </div>
      {mesh.data ? (
        <RegisterDeviceDialog meshId={mesh.data.id} open={open} onClose={() => setOpen(false)} />
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
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const label = String(form.get("label") ?? "").trim();
    const parsed = zDevicesCreateData.safeParse({
      body: {
        mesh_id: meshId,
        node_id: Number(form.get("node_id")),
        is_gateway: form.get("is_gateway") === "on",
        label: label === "" ? null : label,
      },
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path.at(-1) ?? "form");
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    create.mutate({ body: parsed.data.body });
  }

  return (
    <Modal
      open={open}
      title={formatMessage({ id: "page.meshes.detail.registerDialog.title", defaultMessage: "Register device" })}
      description={formatMessage({
        id: "page.meshes.detail.registerDialog.description",
        defaultMessage: "A registered gateway authorizes its traffic to be decoded.",
      })}
      onClose={onClose}
    >
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
          <FormField
            id="device-label"
            label={formatMessage({ id: "page.meshes.detail.registerDialog.label", defaultMessage: "Label" })}
            error={errors.label}
          >
            <Input id="device-label" name="label" autoComplete="off" />
          </FormField>
          <FormField
            id="device-node"
            label={formatMessage({ id: "page.meshes.detail.registerDialog.nodeId", defaultMessage: "Node id" })}
            error={errors.node_id}
          >
            <FormNumber id="device-node" name="node_id" min={0} required />
          </FormField>
          <FormCheckbox
            id="device-gateway"
            name="is_gateway"
            label={formatMessage({
              id: "page.meshes.detail.registerDialog.isGateway",
              defaultMessage: "This device is a gateway",
            })}
          />
        </FieldGroup>
        {create.error ? (
          <StatusCopy>
            {formatMessage({
              id: "page.meshes.detail.registerDialog.error",
              defaultMessage: "Registration failed. Check node id and try again.",
            })}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "page.meshes.detail.registerDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" disabled={create.isPending}>
            {create.isPending
              ? formatMessage({
                  id: "page.meshes.detail.registerDialog.registering",
                  defaultMessage: "Registering device",
                })
              : formatMessage({ id: "page.meshes.detail.registerDialog.title", defaultMessage: "Register device" })}
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
