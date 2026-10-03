import type { SourceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { DataTable } from "@mtt/ui/components/data-table";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { Navigate } from "@tanstack/react-router";
import { type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { SettingsButton } from "@/components/settings-button";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { useMe } from "@/features/auth/use-me";
import { meshRepository } from "@/features/mesh/repository";
import { sourceTitle } from "@/features/source/model";
import { sourceRepository } from "@/features/source/repository";
import { SourceDialog } from "@/features/source/ui/source-dialog";
import { RenewSourceTermsDialog } from "@/features/source/ui/renew-source-terms-dialog";
import { SourceStatusChip } from "@/features/source/ui/source-status-chip";
import { termsLocale, termsStanding, type TermsAcceptance } from "@/features/terms/model";
import { termsRepository } from "@/features/terms/repository";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";
import { TermsStandingChip } from "@/features/terms/ui/terms-standing-chip";
import { useTermsEnforced } from "@/features/terms/use-terms-enforced";
import { useFormatters } from "@/hooks/use-formatters";
import { DeleteSourceDialog } from "@/features/source/ui/delete-source-dialog";
import { pageHeadingClass } from "@/lib/page-heading";
import { routes } from "@/router";

type SourceRow = SourceRead & { meshes: number };

const col = legacyCreateColumnHelper<SourceRow>();

export function SourcesPage(): ReactElement {
  const { formatMessage, locale } = useIntl();
  const { formatWhen } = useFormatters();
  const { me, meId, isOperator } = useMe();
  // A self-hosted instance asks for no terms: no terms step, column or renewals.
  // Flows treat "unknown" as enforced; the version lookup waits for a definite yes.
  const enforced = useTermsEnforced();
  const termsEnforced = enforced !== false;
  // The current version, to tell a source accepted under older terms.
  const currentTerms = useQuery({
    ...termsRepository.source({ query: { locale: termsLocale(locale) } }),
    enabled: isOperator && enforced === true,
  });
  const sources = useQuery({ ...sourceRepository.list(), enabled: isOperator });
  const meshes = useQuery({ ...meshRepository.list(), enabled: isOperator });
  const [termsOpen, setTermsOpen] = useState(false);
  // Accepted anew for every source added, and dropped when the add dialog closes.
  const [addOpen, setAddOpen] = useState(false);
  const [termsAcceptance, setTermsAcceptance] = useState<TermsAcceptance | null>(null);
  const [sourceToRenew, setSourceToRenew] = useState<SourceRow | null>(null);
  const [saved, setSaved] = useState<{ source: SourceRead; created: boolean } | null>(null);
  const [sourceToEdit, setSourceToEdit] = useState<SourceRow | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<SourceRow | null>(null);

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
      col.accessor((row) => row.ssl ?? true, {
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
      col.accessor((row) => row.qos ?? 1, {
        id: "qos",
        header: formatMessage({ id: "page.sources.list.columns.qos", defaultMessage: "QoS" }),
        cell: (info) => <span className="tabular-nums text-text-secondary">{info.getValue()}</span>,
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
            cell: (info) => {
              const row = info.row.original;
              const standing = termsStanding({
                acceptedVersion: row.terms_accepted_version,
                expiresAt: row.terms_expires_at,
                pausedAt: row.paused_at,
                currentVersion: currentTerms.data?.version,
                now: new Date(),
              });
              return (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-text-secondary">
                    {row.terms_expires_at
                      ? formatMessage(
                          { id: "page.sources.list.terms.until", defaultMessage: "Until {when}" },
                          { when: formatWhen(row.terms_expires_at) },
                        )
                      : formatMessage({ id: "page.sources.list.terms.noLimit", defaultMessage: "No time limit" })}
                  </span>
                  <TermsStandingChip standing={standing} />
                  {/* Only the operator who created a source accepts its terms. */}
                  {standing !== "ok" && row.created_by_id === meId ? (
                    <Button type="button" size="xs" variant="secondary" onClick={() => setSourceToRenew(row)}>
                      {formatMessage({ id: "page.sources.list.renew", defaultMessage: "Renew" })}
                    </Button>
                  ) : null}
                </span>
              );
            },
          }),
          ]
        : []),
      col.accessor("meshes", {
        header: formatMessage({ id: "page.sources.list.columns.meshes", defaultMessage: "Meshes" }),
        cell: (info) => <span className="tabular-nums text-text-secondary">{info.getValue()}</span>,
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
    [formatMessage, formatWhen, meId, currentTerms.data?.version, termsEnforced],
  );

  // Wait for `me` before deciding; members never see this tab, and a typed URL goes back to meshes.
  if (me && !isOperator) return <Navigate to={routes.meshes} replace />;

  return (
    <>
      <div className={pageHeadingClass}>
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
          {formatMessage({ id: "page.sources.list.title", defaultMessage: "Sources" })}
        </h1>
        <Button type="button" size="small" leadingIcon={RiAddLine} onClick={() => (termsEnforced ? setTermsOpen(true) : setAddOpen(true))}>
          {formatMessage({ id: "page.sources.list.addSource", defaultMessage: "Add source" })}
        </Button>
      </div>
      <div className="flex flex-col gap-6">
        {saved ? (
          <StatusCopy>
            {saved.created
              ? formatMessage(
                  {
                    id: "page.sources.list.created",
                    defaultMessage:
                      "{source} was added. Bridge status: {status}. Attach it to a mesh from the mesh's edit dialog.",
                  },
                  { source: sourceTitle(saved.source), status: saved.source.status },
                )
              : formatMessage(
                  {
                    id: "page.sources.list.updated",
                    defaultMessage: "{source} was saved. Bridge status: {status}.",
                  },
                  { source: sourceTitle(saved.source), status: saved.source.status },
                )}
          </StatusCopy>
        ) : null}
        <Frame className="shadow-card">
          <FrameHeader>
            <FrameTitle>
              {formatMessage({ id: "page.sources.list.panel.title", defaultMessage: "Your sources" })}
            </FrameTitle>
            <FrameDescription>
              {sources.error
                ? formatMessage({
                    id: "page.sources.list.panel.error",
                    defaultMessage: "Sources didn't load. Check your connection to the API and try again.",
                  })
                : formatMessage({
                    id: "page.sources.list.panel.description",
                    defaultMessage:
                      "Remote MQTT brokers bridged into this instance.",
                  })}
            </FrameDescription>
          </FrameHeader>
          <FramePanel>
            {sources.isPending ? <SkeletonRows /> : null}
            {sources.error || sources.isPending ? null : (
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
                empty={formatMessage({
                  id: "page.sources.list.empty",
                  defaultMessage: "No sources yet. Add one to bridge a topic from another broker.",
                })}
              />
            )}
          </FramePanel>
        </Frame>
      </div>
      <TermsDialog
        open={termsOpen}
        kind="source"
        onClose={() => setTermsOpen(false)}
        onAccepted={(acceptance) => {
          setTermsOpen(false);
          setTermsAcceptance(acceptance);
          setAddOpen(true);
        }}
      />
      <SourceDialog
        open={addOpen}
        termsAcceptance={termsAcceptance}
        onClose={() => {
          setAddOpen(false);
          setTermsAcceptance(null);
        }}
        onSaved={(source) => setSaved({ source, created: true })}
      />
      {sourceToEdit ? (
        <SourceDialog
          open
          source={sourceToEdit}
          onClose={() => setSourceToEdit(null)}
          onSaved={(source) => setSaved({ source, created: false })}
        />
      ) : null}
      <RenewSourceTermsDialog
        source={sourceToRenew}
        onClose={() => setSourceToRenew(null)}
        onRenewed={(source) => setSaved({ source, created: false })}
      />
      <DeleteSourceDialog
        key={sourceToDelete?.id ?? "none"}
        source={sourceToDelete}
        onClose={() => setSourceToDelete(null)}
      />
    </>
  );
}
