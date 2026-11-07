import type { DeviceRead, Mesh } from "@mtt/contracts";
import { Button, ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { type ReactElement, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { DataTable } from "@mtt/ui/components/data-table";
import { SmartFilterToolbar, useSmartFilters, type FilterSpec } from "@/components/smart-filters";
import { sourceStatus, sourceTitle } from "@/features/source/model";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { deviceRepository } from "@/features/device/repository";
import { matchesListQuery } from "@mtt/contracts/list-filter";
import { routes } from "@/router";
import { ListScaffold } from "@/components/list-scaffold";
import { SettingsButton } from "@/components/settings-button";
import { meshRepository } from "@/features/mesh/repository";
import { MESH_STATUS_RANK, NO_SOURCE, canEditMesh, meshStatus, meshTitle, type MeshStatus } from "@/features/mesh/model";
import { MeshStatusChip } from "@/features/mesh/ui/mesh-status-chip";
import { termsLocale, useTermsEnforced } from "@mtt/contracts/terms";
import { termsRepository } from "@/features/terms/repository";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";
import { DeleteMeshDialog } from "@/features/mesh/ui/delete-mesh-dialog";
import { EditMeshDialog } from "@/features/mesh/ui/edit-mesh-dialog";
import { CreateMeshDialog, type CreateMeshStart } from "./create-mesh-dialog";
import { MeshOriginDialog } from "./mesh-origin-dialog";
import { MeshAccessBadge } from "@/features/mesh/ui/mesh-access-badge";
import { MeshSourceLabel } from "@/features/mesh/ui/mesh-source-label";
import { sourceRepository } from "@/features/source/repository";
import { RouterButtonLink } from "@/components/router-button-link";
import { canUseArchive, meshArchiveState } from "@/features/archive/model";
import { MeshArchiveButton } from "@/features/archive/ui/mesh-archive-button";

type MeshRow = Mesh & { devices: number; deviceRows: DeviceRead[] };

type ShownMeshStatus = Exclude<MeshStatus["kind"], "hidden">;

/** Filter menu order: usable states first, then the ones that have stopped. A missing kind does not typecheck. */
const STATUS_FILTER_ORDER = statusFilterOrder([
  "active",
  "renewSoon",
  "termsChanged",
  "termsNotAccepted",
  "scheduledForDeletion",
  "sourcePaused",
  "sourceDisconnected",
  "sourceUnknown",
]);

function statusFilterOrder<const T extends readonly ShownMeshStatus[]>(
  kinds: Exclude<ShownMeshStatus, T[number]> extends never ? T : never,
): T {
  return kinds;
}

const col = legacyCreateColumnHelper<MeshRow>();

export function MeshesPage(): ReactElement {
  const { formatMessage, locale } = useIntl();
  // Every visible mesh loads at once and the filters run on the rows, so they can cover
  // what the table derives (status, device count) as well as what the API returns.
  const meshes = useQuery(meshRepository.list());
  const devices = useQuery(deviceRepository.list());
  const { me, isSuperuser, isOperator, meId, ownerName } = useOwnerDirectory();
  const sources = useQuery({ ...sourceRepository.list(), enabled: isOperator });
  // Creating a mesh: operators with sources first pick where its traffic comes from;
  // the default broker then asks for the mesh terms, accepted anew for each mesh.
  const [originOpen, setOriginOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [createStart, setCreateStart] = useState<CreateMeshStart | null>(null);

  function startCreate() {
    // With no terms, the origin step has nothing to decide: the form's select covers it.
    if (!termsEnforced) setCreateStart({ sourceId: null, termsAcceptance: null });
    else if (isOperator && (sources.data?.length ?? 0) > 0) setOriginOpen(true);
    else setTermsOpen(true);
  }
  // A self-hosted instance asks for no terms; unknown counts as enforced.
  // Flows treat "unknown" as enforced; the version lookup waits for a definite yes.
  const enforced = useTermsEnforced();
  const termsEnforced = enforced !== false;
  const meshTerms = useQuery({
    ...termsRepository.mesh({ locale: termsLocale(locale) }),
    enabled: enforced === true,
  });
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
  // Public meshes can belong to someone else, so say whose.
  const showOwner = isSuperuser || rows.some((row) => row.owner_id !== meId);
  // Only operators have sources; for everyone else every mesh is on the default broker.
  const showSource = isOperator || rows.some((row) => row.source_id != null);
  // Display only: terms count once confirmed, so a lite instance never flashes terms states.
  const sourceStatusById = new Map((sources.data ?? []).map((source) => [source.id, sourceStatus(source.status)]));
  const statusOf = (row: MeshRow) =>
    meshStatus(row, {
      termsEnforced: enforced === true,
      currentTermsVersion: meshTerms.data?.version,
      sourceStatus: row.source_id ? sourceStatusById.get(row.source_id) : undefined,
      now: new Date(),
    });
  const sourceRows = sources.data ?? [];

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
                  label: formatMessage({ id: "feature.mesh.sourceLabel.default", defaultMessage: "Default broker" }),
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
        options: STATUS_FILTER_ORDER.map((kind) => ({ value: kind, label: meshStatusLabel(kind, formatMessage) })),
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
                label:
                  ownerId === meId
                    ? formatMessage({ id: "common.ownerColumn.me", defaultMessage: "{name} (me)" }, { name: ownerName(ownerId) })
                    : ownerName(ownerId),
              })),
            },
          ]
        : []),
    ],
    // ownerName is rebuilt on every render; the owner ids are what change the options.
    [formatMessage, showSource, showOwner, sourceRows, ownerIds, meId],
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
              className="rounded-full outline-hidden hover:text-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
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
          const canEdit = canEditMesh(row.original, me);
          // Only where the API sent each device's setting, which it does for the owner and superusers.
          const canArchive =
            canUseArchive(me, row.original.owner_id) && meshArchiveState(row.original.deviceRows).devices > 0;
          return (
            <div className="flex justify-start gap-2 whitespace-nowrap">
              <RouterButtonLink to={routes.mesh} params={{ meshId: row.original.id }} size="xs" variant="secondary">
                {formatMessage({ id: "page.meshes.list.open", defaultMessage: "Open" })}
              </RouterButtonLink>
              {canEdit ? (
                <SettingsButton
                  label={formatMessage({ id: "page.meshes.list.edit", defaultMessage: "Edit mesh" })}
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
    [formatMessage, me, meId, ownerName, showOwner, showSource, sources.data, meshTerms.data?.version, enforced],
  );

  const showSetup = rows.length === 0 && !meshes.isPending && !filters.active;
  return (
    <>
      <ListScaffold
        title={formatMessage({ id: "page.meshes.list.title", defaultMessage: "Meshes" })}
        actions={
          <>
            {showSetup ? (
              <ButtonLink href="/start" size="small">
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

type FormatMessage = (descriptor: { id: string; defaultMessage: string }) => string;

function meshStatusLabel(kind: ShownMeshStatus, formatMessage: FormatMessage): string {
  const labels: Record<ShownMeshStatus, { id: string; defaultMessage: string }> = {
    active: { id: "feature.mesh.status.active", defaultMessage: "Active" },
    renewSoon: { id: "feature.mesh.status.renewSoon", defaultMessage: "Renew soon" },
    termsChanged: { id: "feature.mesh.status.termsChanged", defaultMessage: "Terms changed" },
    termsNotAccepted: { id: "feature.mesh.status.termsNotAccepted", defaultMessage: "Terms not accepted" },
    scheduledForDeletion: { id: "feature.mesh.status.scheduledForDeletion", defaultMessage: "Scheduled for deletion" },
    sourcePaused: { id: "feature.mesh.status.sourcePaused", defaultMessage: "Source paused" },
    sourceDisconnected: { id: "feature.mesh.status.sourceDisconnected", defaultMessage: "Source disconnected" },
    sourceUnknown: { id: "feature.mesh.status.sourceUnknown", defaultMessage: "Source status unknown" },
  };
  return formatMessage(labels[kind]);
}
