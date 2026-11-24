import type { SourceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { DataTable } from "@mtt/ui/components/data-table";
import { RiAddLine, RiDeleteBinLine, RiRestartLine } from "@remixicon/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { ListScaffold } from "@/components/list-scaffold";
import { SettingsButton } from "@/components/settings-button";
import { StatusCopy } from "@/components/status-copy";
import { useMe } from "@/features/auth/use-me";
import { SOURCE_DEFAULTS } from "@mtt/contracts/source";
import { meshRepository } from "@/features/mesh/repository";
import { sourceTitle } from "@/features/source/model";
import { sourceRepository } from "@/features/source/repository";
import { DeleteSourceDialog } from "@/features/source/ui/delete-source-dialog";
import { SourceDialog } from "@/features/source/ui/source-dialog";
import { RenewTermsDialog } from "@/features/terms/ui/renew-terms-dialog";
import { RestartSourceDialog } from "@/features/source/ui/restart-source-dialog";
import { SourceStatusChip } from "@/features/source/ui/source-status-chip";
import { TermsCell } from "@/features/terms/ui/terms-cell";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";
import { useEntityTerms } from "@/features/terms/use-entity-terms";

type SourceRow = SourceRead & { meshes: number };

const col = legacyCreateColumnHelper<SourceRow>();

export function SourcesView(): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const { meId } = useMe();
  // A self-hosted instance asks for no terms: no terms step, column or renewals.
  const { asked: termsEnforced, currentVersion, ...add } = useEntityTerms("source");
  const sources = useQuery(sourceRepository.list());
  const meshes = useQuery(meshRepository.list());
  const [sourceToRenew, setSourceToRenew] = useState<SourceRow | null>(null);
  const [saved, setSaved] = useState<{ source: SourceRead; action: "created" | "updated" | "restarted" } | null>(null);
  const [sourceToEdit, setSourceToEdit] = useState<SourceRow | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<SourceRow | null>(null);
  const [sourceToRestart, setSourceToRestart] = useState<SourceRow | null>(null);

  const rows = useMemo<SourceRow[]>(() => {
    const counts = new Map<string, number>();
    for (const mesh of meshes.data ?? []) {
      if (mesh.source_id) counts.set(mesh.source_id, (counts.get(mesh.source_id) ?? 0) + 1);
    }
    return (sources.data ?? []).map((source) => ({ ...source, meshes: counts.get(source.id) ?? 0 }));
  }, [sources.data, meshes.data]);

  const columns = useMemo(
    () => [
      col.accessor((row) => sourceTitle(row), {
        id: "label",
        header: formatMessage({ id: "page.sources.list.columns.source", defaultMessage: "Source" }),
        cell: (info) => <span className="text-text-primary">{info.getValue()}</span>,
      }),
      col.accessor("server", {
        header: formatMessage({ id: "page.sources.list.columns.server", defaultMessage: "Server" }),
        cell: (info) => <span className="font-mono text-text-secondary">{info.getValue()}</span>,
      }),
      col.accessor("topic", {
        header: formatMessage({ id: "page.sources.list.columns.topic", defaultMessage: "Topic filter" }),
        cell: (info) => <span className="font-mono text-text-secondary">{info.getValue()}</span>,
      }),
      col.accessor((row) => row.ssl ?? SOURCE_DEFAULTS.ssl, {
        id: "ssl",
        header: formatMessage({ id: "page.sources.list.columns.ssl", defaultMessage: "TLS" }),
        cell: (info) => (
          <span className="text-text-secondary">
            {info.getValue()
              ? formatMessage({ id: "page.sources.list.ssl.on", defaultMessage: "On" })
              : formatMessage({ id: "page.sources.list.ssl.off", defaultMessage: "Off" })}
          </span>
        ),
      }),
      col.accessor((row) => row.qos ?? SOURCE_DEFAULTS.qos, {
        id: "qos",
        header: formatMessage({ id: "page.sources.list.columns.qos", defaultMessage: "QoS" }),
        cell: (info) => <span className="text-text-secondary tabular-nums">{info.getValue()}</span>,
      }),
      col.accessor("status", {
        header: formatMessage({ id: "page.sources.list.columns.status", defaultMessage: "Status" }),
        cell: (info) => <SourceStatusChip status={info.getValue()} />,
      }),
      ...(termsEnforced
        ? [
          col.accessor("terms_expires_at", {
            id: "terms",
            header: formatMessage({ id: "page.sources.list.columns.terms", defaultMessage: "Terms" }),
            cell: (info) => (
              <TermsCell
                entity={info.row.original}
                currentVersion={currentVersion}
                canRenew={info.row.original.created_by_id === meId}
                onRenew={() => setSourceToRenew(info.row.original)}
              />
            ),
          }),
          ]
        : []),
      col.accessor("meshes", {
        header: formatMessage({ id: "page.sources.list.columns.meshes", defaultMessage: "Meshes" }),
        cell: (info) => <span className="text-text-secondary tabular-nums">{info.getValue()}</span>,
      }),
      col.display({
        id: "actions",
        header: formatMessage({ id: "page.sources.list.columns.actions", defaultMessage: "Actions" }),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-start gap-2">
            <SettingsButton
              label={formatMessage({ id: "page.sources.list.edit", defaultMessage: "Edit source" })}
              onClick={() => setSourceToEdit(row.original)}
            />
            {/* A paused source has no bridge to restart; renewing its terms starts it. */}
            {row.original.paused_at ? null : (
              <Button
                type="button"
                size="xs"
                variant="secondary"
                iconOnly
                leadingIcon={RiRestartLine}
                aria-label={formatMessage({ id: "page.sources.list.restart", defaultMessage: "Restart source" })}
                onClick={() => setSourceToRestart(row.original)}
              />
            )}
            <Button
              type="button"
              size="xs"
              variant="danger"
              iconOnly
              leadingIcon={RiDeleteBinLine}
              aria-label={formatMessage({ id: "page.sources.list.delete", defaultMessage: "Delete source" })}
              onClick={() => setSourceToDelete(row.original)}
            />
          </div>
        ),
      }),
    ],
    [formatMessage, meId, currentVersion, termsEnforced],
  );

  return (
    <>
      <ListScaffold
        title={formatMessage({ id: "page.sources.list.title", defaultMessage: "Sources" })}
        actions={
          <Button type="button" size="small" leadingIcon={RiAddLine} onClick={add.startCreate}>
            {formatMessage({ id: "page.sources.list.addSource", defaultMessage: "Add source" })}
          </Button>
        }
        notice={
          saved ? (
            <StatusCopy>
              {saved.action === "created"
                ? formatMessage(
                    {
                      id: "page.sources.list.created",
                      defaultMessage:
                        "{source} was added. Bridge status: {status}. Attach it to a mesh from the mesh's edit dialog.",
                    },
                    { source: sourceTitle(saved.source), status: saved.source.status },
                  )
                : formatMessage(
                    saved.action === "restarted"
                      ? {
                          id: "page.sources.list.restarted",
                          defaultMessage: "{source} was restarted. Bridge status: {status}.",
                        }
                      : {
                          id: "page.sources.list.updated",
                          defaultMessage: "{source} was saved. Bridge status: {status}.",
                        },
                    { source: sourceTitle(saved.source), status: saved.source.status },
                  )}
            </StatusCopy>
          ) : null
        }
        panelTitle={formatMessage({ id: "page.sources.list.panel.title", defaultMessage: "Your sources" })}
        panelDescription={
          sources.error
            ? formatMessage({
                id: "page.sources.list.panel.error",
                defaultMessage: "Sources didn't load. Check your connection to the API and try again.",
              })
            : formatMessage({
                id: "page.sources.list.panel.description",
                defaultMessage: "Remote MQTT brokers bridged into this instance.",
              })
        }
        pending={sources.isPending}
        failed={Boolean(sources.error)}
      >
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          empty={formatMessage({
            id: "page.sources.list.empty",
            defaultMessage: "No sources yet. Add one to bridge a topic from another broker.",
          })}
        />
      </ListScaffold>
      <TermsDialog open={add.termsOpen} kind="source" onClose={add.closeTerms} onAccepted={add.accepted} />
      <SourceDialog
        open={add.formOpen}
        termsAcceptance={add.acceptance}
        onClose={add.closeForm}
        onSaved={(source) => setSaved({ source, action: "created" })}
      />
      {sourceToEdit ? (
        <SourceDialog
          open
          source={sourceToEdit}
          onClose={() => setSourceToEdit(null)}
          onSaved={(source) => setSaved({ source, action: "updated" })}
        />
      ) : null}
      <RenewTermsDialog
        kind="source"
        entity={sourceToRenew && { id: sourceToRenew.id, name: sourceTitle(sourceToRenew) }}
        onClose={() => setSourceToRenew(null)}
        onRenewed={async (renewed) => {
          await queryClient.invalidateQueries({ queryKey: sourceRepository.listKey() });
          setSaved({ source: renewed, action: "updated" });
          setSourceToRenew(null);
        }}
      />
      <RestartSourceDialog
        source={sourceToRestart}
        onClose={() => setSourceToRestart(null)}
        onRestarted={(source) => setSaved({ source, action: "restarted" })}
      />
      <DeleteSourceDialog
        key={sourceToDelete?.id ?? "none"}
        source={sourceToDelete}
        onClose={() => setSourceToDelete(null)}
      />
    </>
  );
}
