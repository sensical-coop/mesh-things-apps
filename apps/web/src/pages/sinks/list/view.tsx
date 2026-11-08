import type { SinkCredentials, SinkRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { DataTable } from "@mtt/ui/components/data-table";
import { RiAddLine, RiDeleteBinLine, RiKey2Line } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { ListScaffold } from "@/components/list-scaffold";
import { SettingsButton } from "@/components/settings-button";
import { StatusCopy } from "@/components/status-copy";
import { useMe } from "@/features/auth/use-me";
import { sinkTitle } from "@/features/sink/model";
import { entityTermsStanding } from "@/features/terms/model";
import { sinkRepository } from "@/features/sink/repository";
import { DeleteSinkDialog } from "@/features/sink/ui/delete-sink-dialog";
import { RenewTermsDialog } from "@/features/terms/ui/renew-terms-dialog";
import { RotateSinkCredentialsDialog } from "@/features/sink/ui/rotate-sink-credentials-dialog";
import { SinkCredentialsDialog } from "@/features/sink/ui/sink-credentials-dialog";
import { SinkDialog } from "@/features/sink/ui/sink-dialog";
import { SinkStatusChip } from "@/features/sink/ui/sink-status-chip";
import { termsLocale, useTermsEnforced } from "@mtt/contracts/terms";
import { type TermsAcceptance } from "@/features/terms/model";
import { termsRepository } from "@/features/terms/repository";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";
import { TermsStandingChip } from "@/features/terms/ui/terms-standing-chip";
import { useFormatters } from "@/hooks/use-formatters";
import { readApiError } from "@mtt/contracts/errors";

const col = legacyCreateColumnHelper<SinkRead>();

export function SinksView(): ReactElement {
  const { formatMessage, locale } = useIntl();
  const { formatWhen } = useFormatters();
  const queryClient = useQueryClient();
  const { meId } = useMe();
  // A self-hosted instance asks for no terms: no terms step, column or renewals.
  const enforced = useTermsEnforced();
  const termsEnforced = enforced !== false;
  const currentTerms = useQuery({
    ...termsRepository.sink({ locale: termsLocale(locale) }),
    enabled: enforced === true,
  });
  const sinks = useQuery(sinkRepository.list());
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
  const renew = useMutation({
    ...termsRepository.renewSink(),
    onSuccess: async (renewed) => {
      await queryClient.invalidateQueries({ queryKey: sinkRepository.listKey() });
      setSaved(renewed);
      renew.reset();
      setSinkToRenew(null);
    },
  });

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
          <span className="text-text-secondary tabular-nums">{info.getValue() ?? "—"}</span>
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
                const standing = entityTermsStanding(row, currentTerms.data?.version, new Date());
                return (
                  <span className="flex items-center gap-2">
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

  return (
    <>
      <ListScaffold
        title={formatMessage({ id: "page.sinks.list.title", defaultMessage: "Sinks" })}
        actions={
          unavailable ? null : (
            <Button
              type="button"
              size="small"
              leadingIcon={RiAddLine}
              onClick={() => (termsEnforced ? setTermsOpen(true) : setCreateOpen(true))}
            >
              {formatMessage({ id: "page.sinks.list.create", defaultMessage: "Create sink" })}
            </Button>
          )
        }
        notice={
          saved ? (
            <StatusCopy>
              {formatMessage({ id: "page.sinks.list.saved", defaultMessage: "{sink} was saved." }, { sink: sinkTitle(saved) })}
            </StatusCopy>
          ) : null
        }
        panelTitle={formatMessage({ id: "page.sinks.list.panel.title", defaultMessage: "Your sinks" })}
        panelDescription={
          unavailable
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
                })
        }
        pending={sinks.isPending}
        failed={Boolean(sinks.error)}
      >
        <DataTable
          data={sinks.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          empty={formatMessage({
            id: "page.sinks.list.empty",
            defaultMessage: "No sinks yet. Create one to publish readings for another service.",
          })}
        />
      </ListScaffold>
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
      <RenewTermsDialog
        open={sinkToRenew !== null}
        kind="sink"
        acceptLabel={
          sinkToRenew
            ? formatMessage({ id: "feature.sink.renew.accept", defaultMessage: "Renew {sink}" }, { sink: sinkTitle(sinkToRenew) })
            : undefined
        }
        pending={renew.isPending}
        error={renew.error}
        onClose={() => {
          renew.reset();
          setSinkToRenew(null);
        }}
        onAccepted={(acceptance) =>
          sinkToRenew &&
          renew.mutate({
            sinkId: sinkToRenew.id,
            data: { terms_version: acceptance.version, terms_locale: acceptance.locale },
          })
        }
      />
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
