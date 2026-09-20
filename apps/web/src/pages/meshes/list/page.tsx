import type { Mesh } from "@mtt/contracts";
import { zMeshesCreateData } from "@mtt/contracts/zod";
import { Button, ButtonLink } from "@mtt/ui/components/base/buttons/button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { type FormEvent, type ReactElement, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { DataTable } from "@mtt/ui/components/data-table";
import { SmartFilterToolbar, useSmartFilters, type FilterSpec } from "@mtt/ui/components/smart-filters";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { FormField } from "@/components/form/form-field";
import { Input } from "@mtt/ui/components/ui/input";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { deviceRepository } from "@/features/device/repository";
import { useTranslatedFilterLabels } from "@/hooks/use-translated-filter-labels";
import { useTranslatedFilterOperatorLabels } from "@/hooks/use-translated-filter-operator-labels";
import { listQuery } from "@mtt/ui/lib/filter-url";
import { href, routes } from "@/router";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { pageHeadingClass } from "@/lib/page-heading";
import { Modal } from "@/components/modal";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";
import { DeleteMeshDialog } from "@/features/mesh/ui/delete-mesh-dialog";
import { EditMeshDialog } from "@/features/mesh/ui/edit-mesh-dialog";

type MeshRow = Mesh & { devices: number };

const col = legacyCreateColumnHelper<MeshRow>();

export function MeshesPage(): ReactElement {
  const { formatMessage } = useIntl();
  const filterLabels = useTranslatedFilterLabels();
  const filterOperatorLabels = useTranslatedFilterOperatorLabels();
  const specs = useMemo<FilterSpec[]>(
    () => [
      {
        key: "label",
        urlKey: "label",
        label: formatMessage({ id: "page.meshes.list.filters.label", defaultMessage: "Label" }),
        type: "text",
      },
      {
        key: "channel_id",
        urlKey: "channel_id",
        label: formatMessage({ id: "page.meshes.list.filters.channelId", defaultMessage: "Channel id" }),
        type: "text",
      },
    ],
    [formatMessage],
  );
  const filters = useSmartFilters({ specs });
  const meshes = useQuery(meshRepository.list({ query: listQuery(filters.queryString) }));
  const devices = useQuery(deviceRepository.list());
  const { isSuperuser, meId, ownerName } = useOwnerDirectory();
  const [open, setOpen] = useState(false);
  const [meshToDelete, setMeshToDelete] = useState<MeshRow | null>(null);
  const [meshToEdit, setMeshToEdit] = useState<MeshRow | null>(null);
  const counts = new Map<string, number>();
  for (const device of devices.data ?? []) {
    counts.set(device.mesh_id, (counts.get(device.mesh_id) ?? 0) + 1);
  }

  const rows = useMemo<MeshRow[]>(
    () => (meshes.data ?? []).map((mesh) => ({ ...mesh, devices: counts.get(mesh.id) ?? 0 })),
    [meshes.data, devices.data],
  );

  const columns = useMemo(
    () => [
      col.accessor((row) => meshTitle(row), {
        id: "label",
        header: formatMessage({ id: "page.meshes.list.columns.mesh", defaultMessage: "Mesh" }),
        cell: (info) => (
          <Link
            to={routes.mesh}
            params={{ meshId: info.row.original.id }}
            className="rounded-full outline-none hover:text-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      col.accessor("channel_id", {
        header: formatMessage({ id: "page.meshes.list.columns.channel", defaultMessage: "Channel" }),
        cell: (info) => <span className="text-text-secondary">{info.getValue()}</span>,
      }),
      col.accessor("devices", {
        header: formatMessage({ id: "page.meshes.list.columns.devices", defaultMessage: "Devices" }),
        cell: (info) => <span className="tabular-nums text-text-secondary">{info.getValue()}</span>,
      }),
      ...(isSuperuser
        ? [
            col.accessor("owner_id", {
              id: "owner",
              header: formatMessage({ id: "page.meshes.list.columns.owner", defaultMessage: "Owner" }),
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
      col.display({
        id: "open",
        header: () => (
          <span className="block text-end">
            {formatMessage({ id: "page.meshes.list.columns.actions", defaultMessage: "Actions" })}
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const canEdit = isSuperuser || row.original.owner_id === meId;
          return (
            <div className="flex justify-start gap-2">
              <ButtonLink href={href(routes.mesh, { meshId: row.original.id })} size="xs" variant="secondary">
                {formatMessage({ id: "page.meshes.list.open", defaultMessage: "Open" })}
              </ButtonLink>
              {canEdit ? (
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() => setMeshToEdit(row.original)}
                >
                  {formatMessage({ id: "page.meshes.list.edit", defaultMessage: "Edit" })}
                </Button>
              ) : null}
              {canEdit ? (
                <Button
                  type="button"
                  size="xs"
                  variant="danger"
                  iconOnly
                  leadingIcon={RiDeleteBinLine}
                  aria-label={formatMessage({
                    id: "page.meshes.list.delete",
                    defaultMessage: "Delete mesh",
                  })}
                  onClick={() => setMeshToDelete(row.original)}
                />
              ) : null}
            </div>
          );
        },
      }),
    ],
    [formatMessage, isSuperuser, meId, ownerName],
  );

  return (
    <>
      <div className={pageHeadingClass}>
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
          {formatMessage({ id: "page.meshes.list.title", defaultMessage: "Meshes" })}
        </h1>
        <Button type="button" size="small" leadingIcon={RiAddLine} onClick={() => setOpen(true)}>
          {formatMessage({ id: "page.meshes.list.createMesh", defaultMessage: "Create mesh" })}
        </Button>
      </div>
      <div className="flex flex-col gap-6">
        <Frame className="shadow-card">
          <FrameHeader>
            <FrameTitle>
              {formatMessage({ id: "page.meshes.list.panel.title", defaultMessage: "Your meshes" })}
            </FrameTitle>
            <FrameDescription>
              {meshes.isPending
                ? formatMessage({
                    id: "page.meshes.list.panel.loading",
                    defaultMessage: "Loading meshes. This usually takes a few seconds.",
                  })
                : meshes.error
                  ? formatMessage({
                      id: "page.meshes.list.panel.error",
                      defaultMessage: "Meshes didn't load. Check your connection to the API and try again.",
                    })
                  : formatMessage({
                      id: "page.meshes.list.panel.description",
                      defaultMessage: "Open a mesh to see its nodes and gateways.",
                    })}
            </FrameDescription>
          </FrameHeader>
          <FramePanel>
            <div className="mb-4">
              <SmartFilterToolbar filters={filters} labels={filterLabels} operatorLabels={filterOperatorLabels} />
            </div>
            {meshes.isPending ? <SkeletonRows /> : null}
            {meshes.error ? null : meshes.isPending ? null : (
              <DataTable
                data={rows}
                columns={columns}
                getRowId={(row) => row.id}
                previousPageLabel={formatMessage({
                  id: "common.dataTable.previousPage",
                  defaultMessage: "Previous page",
                })}
                nextPageLabel={formatMessage({ id: "common.dataTable.nextPage", defaultMessage: "Next page" })}
                pageRangeOfLabel={formatMessage({ id: "common.dataTable.of", defaultMessage: "of" })}
                empty={
                  filters.active
                    ? formatMessage({
                        id: "page.meshes.list.empty.filtered",
                        defaultMessage: "No meshes match these filters.",
                      })
                    : formatMessage({
                        id: "page.meshes.list.empty.default",
                        defaultMessage: "No meshes yet. Create a mesh so gateways have a channel and key to join.",
                      })
                }
              />
            )}
          </FramePanel>
        </Frame>
      </div>
      <CreateMeshDialog open={open} onClose={() => setOpen(false)} />
      {meshToEdit ? (
        <EditMeshDialog mesh={meshToEdit} open onClose={() => setMeshToEdit(null)} />
      ) : null}
      <DeleteMeshDialog
        key={meshToDelete?.id ?? "none"}
        mesh={meshToDelete}
        onClose={() => setMeshToDelete(null)}
      />
    </>
  );
}

function CreateMeshDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useMutation({
    ...meshRepository.create(),
    onSuccess: async (mesh) => {
      await queryClient.invalidateQueries({ queryKey: meshRepository.listKey() });
      onClose();
      void navigate({ to: routes.mesh, params: { meshId: mesh.id } });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const label = String(form.get("label") ?? "").trim();
    const parsed = zMeshesCreateData.safeParse({
      body: {
        channel_id: String(form.get("channel_id") ?? "").trim(),
        psk_b64: String(form.get("psk_b64") ?? ""),
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
      title={formatMessage({ id: "page.meshes.list.createDialog.title", defaultMessage: "Create mesh" })}
      description={formatMessage({
        id: "page.meshes.list.createDialog.description",
        defaultMessage: "Gateways join with this channel id and pre-shared key.",
      })}
      onClose={onClose}
    >
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
          <FormField
            id="mesh-label"
            label={formatMessage({ id: "page.meshes.list.createDialog.label", defaultMessage: "Label" })}
            error={errors.label}
          >
            <Input id="mesh-label" name="label" autoComplete="off" />
          </FormField>
          <FormField
            id="mesh-channel"
            label={formatMessage({ id: "page.meshes.list.createDialog.channelId", defaultMessage: "Channel id" })}
            error={errors.channel_id}
          >
            <Input id="mesh-channel" name="channel_id" required autoComplete="off" />
          </FormField>
          <FormField
            id="mesh-psk"
            label={formatMessage({ id: "page.meshes.list.createDialog.psk", defaultMessage: "PSK" })}
            hint={formatMessage({
              id: "page.meshes.list.createDialog.pskHint",
              defaultMessage: "Base64 channel key. Stored on the mesh, never shown in the list.",
            })}
            error={errors.psk_b64}
          >
            <Input id="mesh-psk" name="psk_b64" type="password" required autoComplete="new-password" />
          </FormField>
        </FieldGroup>
        {create.error ? (
          <StatusCopy>
            {formatMessage({
              id: "page.meshes.list.createDialog.error",
              defaultMessage: "The mesh was not created. Check the fields and try again.",
            })}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "page.meshes.list.createDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" disabled={create.isPending}>
            {create.isPending
              ? formatMessage({ id: "page.meshes.list.createDialog.creating", defaultMessage: "Creating mesh" })
              : formatMessage({ id: "page.meshes.list.createDialog.title", defaultMessage: "Create mesh" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
