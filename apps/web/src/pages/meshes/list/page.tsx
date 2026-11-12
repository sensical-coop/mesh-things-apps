import type { DeviceRead, Mesh } from "@mtt/contracts";
import { tableLinkClass } from "@/lib/link-class";
import { Button, ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { type ReactElement, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { DataTable } from "@mtt/ui/components/data-table";
import { SmartFilterToolbar, useSmartFilters, type FilterSpec } from "@/components/smart-filters";
import { sourceTitle } from "@/features/source/model";
import { useMe } from "@/features/auth/use-me";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { deviceRepository } from "@/features/device/repository";
import { matchesListQuery } from "@mtt/contracts/list-filter";
import { routes } from "@/router";
import { ListScaffold } from "@/components/list-scaffold";
import { SettingsButton } from "@/components/settings-button";
import { DEFAULT_BROKER, MESH_STATUS_RANK, NO_SOURCE, canEditMesh, meshTitle } from "@/features/mesh/model";
import { MeshStatusChip } from "@/features/mesh/ui/mesh-status-chip";
import { useMeshStatusLabels } from "@/features/mesh/use-mesh-status-labels";
import { useMeshDirectory } from "@/features/mesh/use-mesh-directory";
import { useTermsAsked } from "@mtt/contracts/terms";
import { useMeshStatus } from "@/features/mesh/use-mesh-status";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";
import { DeleteMeshDialog } from "@/features/mesh/ui/delete-mesh-dialog";
import { EditMeshDialog } from "@/features/mesh/ui/edit-mesh-dialog";
import { CreateMeshDialog, type CreateMeshStart } from "./create-mesh-dialog";
import { MeshOriginDialog } from "./mesh-origin-dialog";
import { MeshAccessBadge } from "@/features/mesh/ui/mesh-access-badge";
import { MeshSourceLabel } from "@/features/mesh/ui/mesh-source-label";
import { sourceRepository } from "@/features/source/repository";
import { RouterButtonLink } from "@/components/router-button-link";
import { canSwitchMeshArchive } from "@/features/archive/model";
import { MeshArchiveButton } from "@/features/archive/ui/mesh-archive-button";

type MeshRow = Mesh & { devices: number; deviceRows: DeviceRead[] };

const col = legacyCreateColumnHelper<MeshRow>();

export function MeshesPage(): ReactElement {
  const { formatMessage } = useIntl();
  // Every visible mesh loads at once and the filters run on the rows, so they can cover
  // what the table derives (status, device count) as well as what the API returns.
  const { query: meshes, showOwner: ownersShown } = useMeshDirectory();
  const devices = useQuery(deviceRepository.list());
  const { me, isOperator } = useMe();
  const { ownerLabel } = useOwnerDirectory();
  const sources = useQuery({ ...sourceRepository.list(), enabled: isOperator });
  // Creating a mesh: operators with sources first pick where its traffic comes from;
  // the default broker then asks for the mesh terms, accepted anew for each mesh.
  const [originOpen, setOriginOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [createStart, setCreateStart] = useState<CreateMeshStart | null>(null);

  function startCreate() {
    // With no terms, the origin step has nothing to decide: the form's select covers it.
    if (!termsAsked) setCreateStart({ sourceId: null, termsAcceptance: null });
    else if (isOperator && (sources.data?.length ?? 0) > 0) setOriginOpen(true);
    else setTermsOpen(true);
  }
  const termsAsked = useTermsAsked();
  const [meshToDelete, setMeshToDelete] = useState<MeshRow | null>(null);
  const [meshToEdit, setMeshToEdit] = useState<MeshRow | null>(null);
  const rows = useMemo<MeshRow[]>(() => {
    const byMesh = new Map<string, DeviceRead[]>();
    for (const device of devices.data ?? []) {
      byMesh.set(device.mesh_id, [...(byMesh.get(device.mesh_id) ?? []), device]);
    }
    return (meshes.data ?? []).map((mesh) => {
      const deviceRows = byMesh.get(mesh.id) ?? [];
      return { ...mesh, devices: deviceRows.length, deviceRows };
    });
  }, [meshes.data, devices.data]);
  const showOwner = ownersShown(rows.map((row) => row.owner_id));
  // Only operators have sources; for everyone else every mesh is on the default broker.
  const showSource = isOperator || rows.some((row) => row.source_id != null);
  // Display only: terms count once confirmed, so a lite instance never flashes terms states.
  const statusOf = useMeshStatus(sources.data ?? []);
  const sourceRows = sources.data ?? [];
  const { options: statusOptions } = useMeshStatusLabels();

  const ownerIds = useMemo(() => [...new Set(rows.map((row) => row.owner_id))], [rows]);
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
        label: formatMessage({ id: "page.meshes.list.filters.channelId", defaultMessage: "Channel ID" }),
        type: "text",
      },
      ...(showSource
        ? [
            {
              key: "source",
              urlKey: "source",
              label: formatMessage({ id: "page.meshes.list.filters.source", defaultMessage: "Source" }),
              type: "select" as const,
              options: [
                {
                  value: NO_SOURCE,
                  label: formatMessage(DEFAULT_BROKER),
                },
                ...sourceRows.map((source) => ({ value: source.id, label: sourceTitle(source) })),
              ],
            },
          ]
        : []),
      {
        key: "status",
        urlKey: "status",
        label: formatMessage({ id: "page.meshes.list.filters.status", defaultMessage: "Status" }),
        type: "select",
        options: statusOptions,
      },
      {
        key: "access",
        urlKey: "access",
        label: formatMessage({ id: "page.meshes.list.filters.access", defaultMessage: "Access" }),
        type: "select",
        options: [
          { value: "public", label: formatMessage({ id: "feature.mesh.accessBadge.public", defaultMessage: "Public" }) },
          { value: "private", label: formatMessage({ id: "page.meshes.list.filters.accessPrivate", defaultMessage: "Private" }) },
        ],
      },
      {
        key: "devices",
        urlKey: "devices",
        label: formatMessage({ id: "page.meshes.list.filters.devices", defaultMessage: "Devices" }),
        type: "select",
        options: [
          {
            value: "true",
            label: formatMessage({ id: "page.meshes.list.filters.devicesTrue", defaultMessage: "With devices" }),
          },
          {
            value: "false",
            label: formatMessage({ id: "page.meshes.list.filters.devicesFalse", defaultMessage: "Without devices" }),
          },
        ],
      },
      ...(showOwner
        ? [
            {
              key: "owner",
              urlKey: "owner",
              label: formatMessage({ id: "page.meshes.list.filters.owner", defaultMessage: "Owner" }),
              type: "select" as const,
              options: ownerIds.map((ownerId) => ({
                value: ownerId,
                label: ownerLabel(ownerId),
              })),
            },
          ]
        : []),
    ],
    [formatMessage, showSource, showOwner, sourceRows, ownerIds, ownerLabel, statusOptions],
  );
  const filters = useSmartFilters({ specs });
  const shownRows = rows.filter((row) =>
    matchesListQuery((field) => {
      switch (field) {
        case "label":
          return meshTitle(row);
        case "channel_id":
          return row.channel_id;
        case "source":
          return row.source_id ?? NO_SOURCE;
        case "status":
          return statusOf(row).kind;
        case "access":
          return row.is_public ? "public" : "private";
        case "devices":
          return String(row.devices > 0);
        case "owner":
          return row.owner_id;
        default:
          return undefined;
      }
    }, filters.queryString),
  );

  const columns = useMemo(
    () => [
      col.accessor((row) => meshTitle(row), {
        id: "label",
        header: formatMessage({ id: "page.meshes.list.columns.mesh", defaultMessage: "Mesh" }),
        cell: (info) => (
          <span className="flex items-center gap-2">
            <Link
              to={routes.mesh}
              params={{ meshId: info.row.original.id }}
              className={tableLinkClass}
            >
              {info.getValue()}
            </Link>
            <MeshAccessBadge mesh={info.row.original} />
          </span>
        ),
      }),
      col.accessor("channel_id", {
        header: formatMessage({ id: "page.meshes.list.columns.channel", defaultMessage: "Channel" }),
        cell: (info) => <span className="text-text-secondary">{info.getValue()}</span>,
      }),
      ...(showSource
        ? [
            col.accessor((row) => row.source_id ?? "", {
              id: "source",
              header: formatMessage({ id: "page.meshes.list.columns.source", defaultMessage: "Source" }),
              cell: (info) => <MeshSourceLabel mesh={info.row.original} sources={sourceRows} />,
            }),
          ]
        : []),
      col.accessor((row) => MESH_STATUS_RANK[statusOf(row).kind], {
        id: "status",
        // Ranked most urgent first, so the first click lists what needs attention on top.
        sortDescFirst: false,
        header: formatMessage({ id: "page.meshes.list.columns.status", defaultMessage: "Status" }),
        cell: (info) => <MeshStatusChip status={statusOf(info.row.original)} />,
      }),
      col.accessor("devices", {
        header: formatMessage({ id: "page.meshes.list.columns.devices", defaultMessage: "Devices" }),
        cell: (info) => <span className="text-text-secondary tabular-nums">{info.getValue()}</span>,
      }),
      ...(showOwner
        ? [
            col.accessor("owner_id", {
              id: "owner",
              header: formatMessage({ id: "page.meshes.list.columns.owner", defaultMessage: "Owner" }),
              cell: (info) => (
                <span className="text-text-secondary">
                  {ownerLabel(info.getValue())}
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
          const canEdit = canEditMesh(row.original, me);
          // Only where the API sent each device's setting, which it does for the owner and superusers.
          const canArchive = canSwitchMeshArchive(me, row.original.owner_id, row.original.deviceRows);
          return (
            <div className="flex justify-start gap-2 whitespace-nowrap">
              <RouterButtonLink to={routes.mesh} params={{ meshId: row.original.id }} size="xs" variant="secondary">
                {formatMessage({ id: "common.actions.open", defaultMessage: "Open" })}
              </RouterButtonLink>
              {canEdit ? (
                <SettingsButton
                  label={formatMessage({ id: "feature.mesh.actions.edit", defaultMessage: "Edit mesh" })}
                  onClick={() => setMeshToEdit(row.original)}
                />
              ) : null}
              {canArchive ? <MeshArchiveButton mesh={row.original} devices={row.original.deviceRows} /> : null}
              {canEdit ? (
                <Button
                  type="button"
                  size="xs"
                  variant="danger"
                  iconOnly
                  leadingIcon={RiDeleteBinLine}
                  aria-label={formatMessage({
                    id: "feature.mesh.actions.delete",
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
    [formatMessage, me, ownerLabel, showOwner, showSource, sources.data, statusOf],
  );

  const showSetup = rows.length === 0 && !meshes.isPending && !filters.active;
  return (
    <>
      <ListScaffold
        title={formatMessage({ id: "page.meshes.list.title", defaultMessage: "Meshes" })}
        actions={
          <>
            {showSetup ? (
              <ButtonLink href={routes.start} size="small">
                {formatMessage({ id: "page.meshes.list.setupFirst", defaultMessage: "Set up your first mesh" })}
              </ButtonLink>
            ) : null}
            <Button
              type="button"
              size="small"
              variant={showSetup ? "secondary" : "primary"}
              leadingIcon={RiAddLine}
              onClick={startCreate}
            >
              {formatMessage({ id: "page.meshes.list.createMesh", defaultMessage: "Create mesh" })}
            </Button>
          </>
        }
        panelTitle={formatMessage({ id: "page.meshes.list.panel.title", defaultMessage: "Your meshes" })}
        panelDescription={
          meshes.isPending
            ? formatMessage({
                id: "page.meshes.list.panel.loading",
                defaultMessage: "Loading meshes. This usually takes a few seconds.",
              })
            : meshes.error
              ? formatMessage({
                  id: "page.meshes.list.panel.error",
                  defaultMessage: "Meshes didn't load. Check your connection or try again.",
                })
              : formatMessage({
                  id: "page.meshes.list.panel.description",
                  defaultMessage: "Open a mesh to see its nodes and gateways.",
                })
        }
        toolbar={
          <div className="mb-4">
            <SmartFilterToolbar filters={filters} />
          </div>
        }
        pending={meshes.isPending}
        failed={Boolean(meshes.error)}
      >
        <DataTable
          data={shownRows}
          columns={columns}
          getRowId={(row) => row.id}
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
      </ListScaffold>
      <MeshOriginDialog
        open={originOpen}
        sources={sources.data ?? []}
        onClose={() => setOriginOpen(false)}
        onChoose={(sourceId) => {
          setOriginOpen(false);
          if (sourceId === null) setTermsOpen(true);
          else setCreateStart({ sourceId, termsAcceptance: null });
        }}
      />
      <TermsDialog
        open={termsOpen}
        kind="mesh"
        onClose={() => setTermsOpen(false)}
        onAccepted={(acceptance) => {
          setTermsOpen(false);
          setCreateStart({ sourceId: null, termsAcceptance: acceptance });
        }}
      />
      <CreateMeshDialog start={createStart} onClose={() => setCreateStart(null)} />
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
