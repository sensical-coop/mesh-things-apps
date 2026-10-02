import type { SinkCredentials, SinkRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { DataTable } from "@mtt/ui/components/data-table";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { RiAddLine, RiDeleteBinLine, RiKey2Line } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { Navigate } from "@tanstack/react-router";
import { type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { SettingsButton } from "@/components/settings-button";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { sinkTitle } from "@/features/sink/model";
import { sinkRepository } from "@/features/sink/repository";
import { DeleteSinkDialog } from "@/features/sink/ui/delete-sink-dialog";
import { RenewSinkTermsDialog } from "@/features/sink/ui/renew-sink-terms-dialog";
import { RotateSinkCredentialsDialog } from "@/features/sink/ui/rotate-sink-credentials-dialog";
import { SinkCredentialsDialog } from "@/features/sink/ui/sink-credentials-dialog";
import { SinkDialog } from "@/features/sink/ui/sink-dialog";
import { SinkStatusChip } from "@/features/sink/ui/sink-status-chip";
import { termsLocale, termsStanding, type TermsAcceptance } from "@/features/terms/model";
import { termsRepository } from "@/features/terms/repository";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";
import { TermsStandingChip } from "@/features/terms/ui/terms-standing-chip";
import { useTermsEnforced } from "@/features/terms/use-terms-enforced";
import { useFormatters } from "@/hooks/use-formatters";
import { readApiError } from "@/lib/api-errors";
import { pageHeadingClass } from "@/lib/page-heading";
import { routes } from "@/router";

const col = legacyCreateColumnHelper<SinkRead>();

export function SinksPage(): ReactElement {
  const { formatMessage, locale } = useIntl();
  const { formatWhen } = useFormatters();
  const { me, meId, isOperator } = useOwnerDirectory();
  // A self-hosted instance asks for no terms: no terms step, column or renewals.
  const enforced = useTermsEnforced();
  const termsEnforced = enforced !== false;
  const currentTerms = useQuery({
    ...termsRepository.sink({ query: { locale: termsLocale(locale) } }),
    enabled: isOperator && enforced === true,
  });
  const sinks = useQuery({ ...sinkRepository.list(), enabled: isOperator });
  // No broker API on this instance: every sink route answers 404.
  const unavailable = sinks.error ? readApiError(sinks.error).status === 404 : false;
  const [termsOpen, setTermsOpen] = useState(false);
  // Accepted anew for every sink created, and dropped when the create dialog closes.
  const [createOpen, setCreateOpen] = useState(false);
  const [termsAcceptance, setTermsAcceptance] = useState<TermsAcceptance | null>(null);
  const [credentials, setCredentials] = useState<{ value: SinkCredentials; rotated: boolean } | null>(null);
  const [saved, setSaved] = useState<SinkRead | null>(null);
  const [sinkToEdit, setSinkToEdit] = useState<SinkRead | null>(null);
  const [sinkToRotate, setSinkToRotate] = useState<SinkRead | null>(null);
  const [sinkToRenew, setSinkToRenew] = useState<SinkRead | null>(null);
  const [sinkToDelete, setSinkToDelete] = useState<SinkRead | null>(null);

  const streamLabel = useMemo(
    () => ({
      decoded: formatMessage({ id: "page.sinks.list.stream.decoded", defaultMessage: "Decoded" }),
      derived: formatMessage({ id: "page.sinks.list.stream.derived", defaultMessage: "Derived" }),
      alarms: formatMessage({ id: "page.sinks.list.stream.alarms", defaultMessage: "Alarms" }),
    }),
    [formatMessage],
  );

  const columns = useMemo(
    () => [
      col.accessor((row) => sinkTitle(row), {
        id: "label",
        header: formatMessage({ id: "page.sinks.list.columns.sink", defaultMessage: "Sink" }),
        cell: (info) => <span className="text-text-primary">{info.getValue()}</span>,
      }),
      col.accessor((row) => row.streams.map((stream) => streamLabel[stream]).join(", "), {
        id: "streams",
        header: formatMessage({ id: "page.sinks.list.columns.streams", defaultMessage: "Sends" }),
        cell: (info) => <span className="text-text-secondary">{info.getValue()}</span>,
      }),
      col.accessor((row) => row.mesh_ids.length + row.device_ids.length, {
        id: "from",
        header: formatMessage({ id: "page.sinks.list.columns.from", defaultMessage: "From" }),
        cell: (info) => (
          <span className="text-text-secondary">
            {formatMessage(
              {
                id: "page.sinks.list.from",
                defaultMessage:
                  "{meshes, plural, =0 {} one {# mesh} other {# meshes}}{both, select, yes {, } other {}}{devices, plural, =0 {} one {# device} other {# devices}}{none, select, yes {Nothing yet} other {}}",
              },
              {
                meshes: info.row.original.mesh_ids.length,
                devices: info.row.original.device_ids.length,
                both: info.row.original.mesh_ids.length > 0 && info.row.original.device_ids.length > 0 ? "yes" : "no",
                none: info.getValue() === 0 ? "yes" : "no",
              },
            )}
          </span>
        ),
      }),
      col.accessor("connections", {
        header: formatMessage({ id: "page.sinks.list.columns.consumers", defaultMessage: "Consumers" }),
        cell: (info) => (
          <span className="tabular-nums text-text-secondary">{info.getValue() ?? "—"}</span>
        ),
      }),
      col.accessor("paused_at", {
        id: "status",
        header: formatMessage({ id: "page.sinks.list.columns.status", defaultMessage: "Status" }),
        cell: (info) => <SinkStatusChip sink={info.row.original} />,
      }),
      ...(termsEnforced
        ? [
            col.accessor("terms_expires_at", {
              id: "terms",
              header: formatMessage({ id: "page.sinks.list.columns.terms", defaultMessage: "Terms" }),
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
                            { id: "page.sinks.list.terms.until", defaultMessage: "Until {when}" },
                            { when: formatWhen(row.terms_expires_at) },
                          )
                        : formatMessage({ id: "page.sinks.list.terms.noLimit", defaultMessage: "No time limit" })}
                    </span>
                    <TermsStandingChip standing={standing} />
                    {/* Only the operator who created a sink accepts its terms. */}
                    {standing !== "ok" && row.created_by_id === meId ? (
                      <Button type="button" size="xs" variant="secondary" onClick={() => setSinkToRenew(row)}>
                        {formatMessage({ id: "page.sinks.list.renew", defaultMessage: "Renew" })}
                      </Button>
                    ) : null}
                  </span>
                );
              },
            }),
          ]
        : []),
      col.display({
        id: "actions",
        header: formatMessage({ id: "page.sinks.list.columns.actions", defaultMessage: "Actions" }),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-start gap-2">
            <SettingsButton
              label={formatMessage({ id: "page.sinks.list.edit", defaultMessage: "Edit sink" })}
              onClick={() => setSinkToEdit(row.original)}
            />
            <Button
              type="button"
              size="xs"
              variant="secondary"
              iconOnly
              leadingIcon={RiKey2Line}
              aria-label={formatMessage({ id: "page.sinks.list.rotate", defaultMessage: "Issue a new password" })}
              onClick={() => setSinkToRotate(row.original)}
            />
            <Button
              type="button"
              size="xs"
              variant="danger"
              iconOnly
              leadingIcon={RiDeleteBinLine}
              aria-label={formatMessage({ id: "page.sinks.list.delete", defaultMessage: "Delete sink" })}
              onClick={() => setSinkToDelete(row.original)}
            />
          </div>
        ),
      }),
    ],
    [formatMessage, formatWhen, meId, currentTerms.data?.version, termsEnforced, streamLabel],
  );

  // Wait for `me` before deciding; members never see this tab, and a typed URL goes back to meshes.
  if (me && !isOperator) return <Navigate to={routes.meshes} replace />;

  return (
    <>
      <div className={pageHeadingClass}>
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
          {formatMessage({ id: "page.sinks.list.title", defaultMessage: "Sinks" })}
        </h1>
        {unavailable ? null : (
          <Button
            type="button"
            size="small"
            leadingIcon={RiAddLine}
            onClick={() => (termsEnforced ? setTermsOpen(true) : setCreateOpen(true))}
          >
            {formatMessage({ id: "page.sinks.list.create", defaultMessage: "Create sink" })}
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-6">
        {saved ? (
          <StatusCopy>
            {formatMessage({ id: "page.sinks.list.saved", defaultMessage: "{sink} was saved." }, { sink: sinkTitle(saved) })}
          </StatusCopy>
        ) : null}
        <Frame className="shadow-card">
          <FrameHeader>
            <FrameTitle>{formatMessage({ id: "page.sinks.list.panel.title", defaultMessage: "Your sinks" })}</FrameTitle>
            <FrameDescription>
              {unavailable
                ? formatMessage({
                    id: "page.sinks.list.panel.unavailable",
                    defaultMessage: "This instance doesn't offer sinks: it has no broker for third parties to subscribe to.",
                  })
                : sinks.error
                  ? formatMessage({
                      id: "page.sinks.list.panel.error",
                      defaultMessage: "Sinks didn't load. Check your connection to the API and try again.",
                    })
                  : formatMessage({
                      id: "page.sinks.list.panel.description",
                      defaultMessage:
                        "Readings from your meshes will be published on this instance's MQTT broker. You will be able to subscribe to it. Each sink has its own credentials and topics.",
                    })}
            </FrameDescription>
          </FrameHeader>
          <FramePanel>
            {sinks.isPending ? <SkeletonRows /> : null}
            {sinks.error || sinks.isPending ? null : (
              <DataTable
                data={sinks.data}
                columns={columns}
                getRowId={(row) => row.id}
                previousPageLabel={formatMessage({ id: "common.dataTable.previousPage", defaultMessage: "Previous page" })}
                nextPageLabel={formatMessage({ id: "common.dataTable.nextPage", defaultMessage: "Next page" })}
                pageRangeOfLabel={formatMessage({ id: "common.dataTable.of", defaultMessage: "of" })}
                empty={formatMessage({
                  id: "page.sinks.list.empty",
                  defaultMessage: "No sinks yet. Create one to publish readings for another service.",
                })}
              />
            )}
          </FramePanel>
        </Frame>
      </div>
      <TermsDialog
        open={termsOpen}
        kind="sink"
        onClose={() => setTermsOpen(false)}
        onAccepted={(acceptance) => {
          setTermsOpen(false);
          setTermsAcceptance(acceptance);
          setCreateOpen(true);
        }}
      />
      <SinkDialog
        open={createOpen}
        termsAcceptance={termsAcceptance}
        onClose={() => {
          setCreateOpen(false);
          setTermsAcceptance(null);
        }}
        onCreated={(created) => setCredentials({ value: created, rotated: false })}
        onSaved={setSaved}
      />
      {sinkToEdit ? (
        <SinkDialog
          open
          sink={sinkToEdit}
          onClose={() => setSinkToEdit(null)}
          onCreated={() => undefined}
          onSaved={setSaved}
        />
      ) : null}
      <SinkCredentialsDialog
        credentials={credentials?.value ?? null}
        rotated={credentials?.rotated ?? false}
        onClose={() => setCredentials(null)}
      />
      <RotateSinkCredentialsDialog
        sink={sinkToRotate}
        onClose={() => setSinkToRotate(null)}
        onRotated={(rotated) => {
          setSinkToRotate(null);
          setCredentials({ value: rotated, rotated: true });
        }}
      />
      <RenewSinkTermsDialog sink={sinkToRenew} onClose={() => setSinkToRenew(null)} onRenewed={setSaved} />
      <DeleteSinkDialog
        key={sinkToDelete?.id ?? "none"}
        sink={sinkToDelete}
        onClose={() => setSinkToDelete(null)}
        onEdit={() => {
          setSinkToEdit(sinkToDelete);
          setSinkToDelete(null);
        }}
      />
    </>
  );
}
