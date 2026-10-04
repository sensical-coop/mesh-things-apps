import type { DeviceRead, Mesh } from "@mtt/contracts";
import { zMeshesCreateData } from "@mtt/contracts/zod";
import { Button } from "@mtt/ui/components/base/buttons/button";
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
import { FormCheckbox } from "@/components/form/form-checkbox";
import { FormField } from "@/components/form/form-field";
import { FormSelect } from "@/components/form/form-select";
import { formLevelMessage, issueErrors, readApiError } from "@/lib/api-errors";
import { sourceTitle } from "@/features/source/model";
import { Input } from "@mtt/ui/components/ui/input";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { deviceRepository } from "@/features/device/repository";
import { useTranslatedFilterLabels } from "@/hooks/use-translated-filter-labels";
import { useTranslatedFilterOperatorLabels } from "@/hooks/use-translated-filter-operator-labels";
import { matchesListQuery } from "@/lib/list-filter";
import { routes } from "@/router";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { pageHeadingClass } from "@/lib/page-heading";
import { Modal } from "@/components/modal";
import { SettingsButton } from "@/components/settings-button";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { meshRepository } from "@/features/mesh/repository";
import { MESH_STATUS_RANK, canEditMesh, meshStatus, meshTitle } from "@/features/mesh/model";
import { MeshStatusChip } from "@/features/mesh/ui/mesh-status-chip";
import { termsLocale, type TermsAcceptance } from "@/features/terms/model";
import { termsRepository } from "@/features/terms/repository";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";
import { useTermsEnforced } from "@/features/terms/use-terms-enforced";
import { DeleteMeshDialog } from "@/features/mesh/ui/delete-mesh-dialog";
import { EditMeshDialog } from "@/features/mesh/ui/edit-mesh-dialog";
import { MeshOriginDialog } from "@/features/mesh/ui/mesh-origin-dialog";
import { MeshAccessBadge } from "@/features/mesh/ui/mesh-access-badge";
import { MeshSourceLabel } from "@/features/mesh/ui/mesh-source-label";
import { sourceRepository } from "@/features/source/repository";
import { RouterButtonLink } from "@/components/router-button-link";
import { canUseArchive, meshArchiveState } from "@/features/archive/model";
import { MeshArchiveButton } from "@/features/archive/ui/mesh-archive-button";

type MeshRow = Mesh & { devices: number; deviceRows: DeviceRead[] };

/** Select value for "no source": the instance's own broker. */
const DEFAULT_BROKER = "default";

const col = legacyCreateColumnHelper<MeshRow>();

export function MeshesPage(): ReactElement {
  const { formatMessage, locale } = useIntl();
  const filterLabels = useTranslatedFilterLabels();
  const filterOperatorLabels = useTranslatedFilterOperatorLabels();
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
    ...termsRepository.mesh({ query: { locale: termsLocale(locale) } }),
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
  const sourceStatusById = new Map((sources.data ?? []).map((source) => [source.id, source.status]));
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
                  value: DEFAULT_BROKER,
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
        options: [
          { value: "active", label: formatMessage({ id: "feature.mesh.status.active", defaultMessage: "Active" }) },
          { value: "renewSoon", label: formatMessage({ id: "feature.mesh.status.renewSoon", defaultMessage: "Renew soon" }) },
          {
            value: "termsChanged",
            label: formatMessage({ id: "feature.mesh.status.termsChanged", defaultMessage: "Terms changed" }),
          },
          {
            value: "termsNotAccepted",
            label: formatMessage({ id: "feature.mesh.status.termsNotAccepted", defaultMessage: "Terms not accepted" }),
          },
          {
            value: "scheduledForDeletion",
            label: formatMessage({ id: "feature.mesh.status.scheduledForDeletion", defaultMessage: "Scheduled for deletion" }),
          },
          {
            value: "sourcePaused",
            label: formatMessage({ id: "feature.mesh.status.sourcePaused", defaultMessage: "Source paused" }),
          },
          {
            value: "sourceDisconnected",
            label: formatMessage({ id: "feature.mesh.status.sourceDisconnected", defaultMessage: "Source disconnected" }),
          },
          {
            value: "sourceUnknown",
            label: formatMessage({ id: "feature.mesh.status.sourceUnknown", defaultMessage: "Source status unknown" }),
          },
        ],
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
          return row.source_id ?? DEFAULT_BROKER;
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
          <span className="flex flex-wrap items-center gap-2">
            <Link
              to={routes.mesh}
              params={{ meshId: info.row.original.id }}
              className="rounded-full outline-none hover:text-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
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
        cell: (info) => <span className="tabular-nums text-text-secondary">{info.getValue()}</span>,
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

  return (
    <>
      <div className={pageHeadingClass}>
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
          {formatMessage({ id: "page.meshes.list.title", defaultMessage: "Meshes" })}
        </h1>
        <Button type="button" size="small" leadingIcon={RiAddLine} onClick={startCreate}>
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
                      defaultMessage: "Meshes didn't load. Check your connection or try again.",
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
                data={shownRows}
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

/** How "Create mesh" was started: the traffic's origin, and the mesh terms if it's the default broker. */
type CreateMeshStart = { sourceId: string | null; termsAcceptance: TermsAcceptance | null };

function CreateMeshDialog({
  start,
  onClose,
}: {
  /** Open while set. */
  start: CreateMeshStart | null;
  onClose: () => void;
}): ReactElement {
  const open = start !== null;
  const termsAcceptance = start?.termsAcceptance ?? null;
  const termsEnforced = useTermsEnforced() !== false;
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Only operators have sources to offer; everyone else's meshes use the default broker.
  const { isOperator } = useOwnerDirectory();
  const sources = useQuery({ ...sourceRepository.list(), enabled: open && isOperator });
  const sourceItems = [
    {
      label: formatMessage({ id: "page.meshes.list.createDialog.defaultBroker", defaultMessage: "Default broker" }),
      value: DEFAULT_BROKER,
    },
    ...(sources.data ?? []).map((source) => ({ label: sourceTitle(source), value: source.id })),
  ];
  const create = useMutation({
    ...meshRepository.create(),
    onSuccess: async (mesh) => {
      await queryClient.invalidateQueries({ queryKey: meshRepository.listKey() });
      onClose();
      void navigate({ to: routes.mesh, params: { meshId: mesh.id } });
    },
    onError: (error) => setErrors(readApiError(error).fields),
  });
  // Switching to the default broker in the form, after starting from a source, asks for the terms on save.
  const [awaitingTerms, setAwaitingTerms] = useState<Parameters<typeof create.mutate>[0] | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const label = String(form.get("label") ?? "").trim();
    const picked = String(form.get("source_id") ?? DEFAULT_BROKER);
    const parsed = zMeshesCreateData.safeParse({
      body: {
        channel_id: String(form.get("channel_id") ?? "").trim(),
        psk_b64: String(form.get("psk_b64") ?? ""),
        label: label === "" ? null : label,
        discover_gateways: form.get("discover_gateways") === "on",
        ...(isOperator && picked !== DEFAULT_BROKER ? { source_id: picked } : {}),
        // Required on the default broker; a mesh on a source is covered by the source's terms.
        ...(picked === DEFAULT_BROKER && termsAcceptance
          ? { terms_version: termsAcceptance.version, terms_locale: termsAcceptance.locale }
          : {}),
      },
    });
    if (!parsed.success) {
      setErrors(issueErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    if (termsEnforced && picked === DEFAULT_BROKER && !termsAcceptance) {
      setAwaitingTerms({ body: parsed.data.body });
      return;
    }
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
      <form key={start ? `${start.sourceId ?? "default"}-${start.termsAcceptance?.version ?? "none"}` : "closed"} className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
          <FormField
            id="mesh-label"
            label={formatMessage({ id: "page.meshes.list.createDialog.label", defaultMessage: "Label" })}
            hint={formatMessage({
              id: "page.meshes.list.createDialog.labelHint",
              defaultMessage: "Optional name shown in the console instead of the channel ID, for reference only.",
            })}
            error={errors.label}
          >
            <Input id="mesh-label" name="label" autoComplete="off" />
          </FormField>
          <FormField
            id="mesh-channel"
            label={formatMessage({ id: "page.meshes.list.createDialog.channelId", defaultMessage: "Channel ID" })}
            hint={formatMessage({
              id: "page.meshes.list.createDialog.channelIdHint",
              defaultMessage: "The Meshtastic channel name.",
            })}
            error={errors.channel_id}
          >
            <Input id="mesh-channel" name="channel_id" required autoComplete="off" />
          </FormField>
          <FormField
            id="mesh-psk"
            label={formatMessage({ id: "page.meshes.list.createDialog.psk", defaultMessage: "PSK" })}
            hint={formatMessage({
              id: "page.meshes.list.createDialog.pskHint",
              defaultMessage: "The channel's pre-shared key, in Base64.",
            })}
            error={errors.psk_b64}
          >
            <Input id="mesh-psk" name="psk_b64" type="password" required autoComplete="new-password" />
          </FormField>
          <div className="flex flex-col gap-1">
            <FormCheckbox
              id="mesh-discover-gateways"
              name="discover_gateways"
              label={formatMessage({
                id: "page.meshes.list.createDialog.discoverGateways",
                defaultMessage: "Add gateways automatically",
              })}
            />
            <p className="pl-7 text-caption-1-regular text-text-tertiary">
              {formatMessage({
                id: "page.meshes.list.createDialog.discoverGatewaysHint",
                defaultMessage:
                  "Registers any gateway whose packets decode with this channel and PSK, so you don't add them one by one. Only an operator can use it with a default or blank PSK.",
              })}
            </p>
          </div>
          {isOperator ? (
            <FormField
              id="mesh-source"
              label={formatMessage({ id: "page.meshes.list.createDialog.source", defaultMessage: "Source" })}
              hint={formatMessage({
                id: "page.meshes.list.createDialog.sourceHint",
                defaultMessage: "Where this mesh's gateways publish. Leave on the default broker unless you bridge it.",
              })}
              error={errors.source_id}
            >
              <FormSelect
                id="mesh-source"
                name="source_id"
                items={sourceItems}
                defaultValue={start?.sourceId ?? DEFAULT_BROKER}
              />
            </FormField>
          ) : null}
        </FieldGroup>
        {create.error ? (
          <StatusCopy>
            {formatMessage({
              id: "page.meshes.list.createDialog.error",
              defaultMessage: "The mesh was not created. Check the fields and try again.",
            })}
            {formLevelMessage(create.error) ? ` ${formLevelMessage(create.error)}` : ""}
            {errors.terms_version
              ? ` ${formatMessage({
                  id: "page.meshes.list.createDialog.termsChanged",
                  defaultMessage: "The mesh terms changed. Close this dialog and accept the current terms.",
                })}`
              : ""}
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
      <TermsDialog
        open={awaitingTerms !== null}
        kind="mesh"
        onClose={() => setAwaitingTerms(null)}
        acceptLabel={formatMessage({ id: "page.meshes.list.createDialog.acceptAndCreate", defaultMessage: "Accept and create" })}
        onAccepted={(acceptance) => {
          if (!awaitingTerms) return;
          create.mutate(
            acceptance
              ? { body: { ...awaitingTerms.body, terms_version: acceptance.version, terms_locale: acceptance.locale } }
              : awaitingTerms,
          );
          setAwaitingTerms(null);
        }}
      />
    </Modal>
  );
}
