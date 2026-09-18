import {
  devicesListOptions,
  meshesCreateMutation,
  meshesListOptions,
  meshesListQueryKey,
} from "@mtt/contracts/query";
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
import { RiAddLine } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { type FormEvent, type ReactElement, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { DataTable } from "./components/data-table";
import { SmartFilterToolbar, useSmartFilters, type FilterSpec } from "./components/smart-filters";
import { FieldGroup } from "@/components/ui/field";
import { FormField, Input } from "./form-fields";
import { meshTitle } from "./format";
import { listQuery } from "./lib/filter-url";
import { dialogActionsClass, Modal, pageHeadingClass, SkeletonRows, StatusCopy } from "./widgets";

type MeshRow = Mesh & { devices: number };

const col = legacyCreateColumnHelper<MeshRow>();

export function MeshesPage(): ReactElement {
  const specs = useMemo<FilterSpec[]>(
    () => [
      { key: "label", urlKey: "label", label: "Label", type: "text" },
      { key: "channel_id", urlKey: "channel_id", label: "Channel id", type: "text" },
    ],
    [],
  );
  const filters = useSmartFilters({ specs });
  const meshes = useQuery(meshesListOptions({ query: listQuery(filters.queryString) }));
  const devices = useQuery(devicesListOptions());
  const [open, setOpen] = useState(false);
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
        header: "Mesh",
        cell: (info) => info.getValue(),
      }),
      col.accessor("channel_id", {
        header: "Channel",
        cell: (info) => <span className="text-text-secondary">{info.getValue()}</span>,
      }),
      col.accessor("devices", {
        header: "Devices",
        cell: (info) => <span className="tabular-nums text-text-secondary">{info.getValue()}</span>,
      }),
      col.display({
        id: "open",
        header: () => <span className="block text-end">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ButtonLink href={`/meshes/${row.original.id}`} size="xs" variant="secondary">
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
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">Meshes</h1>
        <Button type="button" size="small" leadingIcon={RiAddLine} onClick={() => setOpen(true)}>
          Create mesh
        </Button>
      </div>
      <div className="flex flex-col gap-6">
        <Frame className="shadow-card">
          <FrameHeader>
            <FrameTitle>Your meshes</FrameTitle>
            <FrameDescription>
              {meshes.isPending
                ? "Loading meshes. This usually takes a few seconds."
                : meshes.error
                  ? "Meshes didn't load. Check that the mock is running on 8787."
                  : "Open a mesh to see its nodes and gateways."}
            </FrameDescription>
          </FrameHeader>
          <FramePanel>
            <div className="mb-4">
              <SmartFilterToolbar filters={filters} />
            </div>
            {meshes.isPending ? <SkeletonRows /> : null}
            {meshes.error ? null : meshes.isPending ? null : (
              <DataTable
                data={rows}
                columns={columns}
                getRowId={(row) => row.id}
                empty={
                  filters.active
                    ? "No meshes match these filters."
                    : "No meshes yet. Create a mesh so gateways have a channel and key to join."
                }
              />
            )}
          </FramePanel>
        </Frame>
      </div>
      <CreateMeshDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function CreateMeshDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useMutation({
    ...meshesCreateMutation(),
    onSuccess: async (mesh) => {
      await queryClient.invalidateQueries({ queryKey: meshesListQueryKey() });
      onClose();
      void navigate({ to: "/meshes/$meshId", params: { meshId: mesh.id } });
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
      title="Create mesh"
      description="Gateways join with this channel id and pre-shared key."
      onClose={onClose}
    >
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
          <FormField id="mesh-label" label="Label" error={errors.label}>
            <Input id="mesh-label" name="label" autoComplete="off" />
          </FormField>
          <FormField id="mesh-channel" label="Channel id" error={errors.channel_id}>
            <Input id="mesh-channel" name="channel_id" required autoComplete="off" />
          </FormField>
          <FormField
            id="mesh-psk"
            label="PSK"
            hint="Base64 channel key. Stored on the mesh, never shown in the list."
            error={errors.psk_b64}
          >
            <Input id="mesh-psk" name="psk_b64" type="password" required autoComplete="new-password" />
          </FormField>
        </FieldGroup>
        {create.error ? (
          <StatusCopy>The mesh was not created. Check the fields and try again.</StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="small" disabled={create.isPending}>
            {create.isPending ? "Creating mesh" : "Create mesh"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
