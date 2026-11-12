import type { Mesh } from "@mtt/contracts";
import { MeshUpdate } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormCheckbox } from "@mtt/ui/forms/form-checkbox";
import { FormField } from "@mtt/ui/forms/form-field";
import { FormSelect } from "@mtt/ui/forms/form-select";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { formLevelMessage, issueErrors, readApiError } from "@mtt/contracts/errors";
import { termsFields } from "@mtt/contracts/terms";
import { dialogActionsClass } from "@mtt/ui/forms/dialog-actions";
import { useMe } from "@/features/auth/use-me";
import { meshRepository } from "@/features/mesh/repository";
import { DEFAULT_BROKER, NO_SOURCE, meshTermsCurrent, meshTitle } from "@/features/mesh/model";
import { sourceTitle } from "@/features/source/model";
import { sourceRepository } from "@/features/source/repository";
import { useMeshTerms } from "@/features/terms/use-mesh-terms";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";
import { ProtocolField } from "@mtt/ui/forms/protocol-field";

export function EditMeshDialog({
  mesh,
  open,
  onClose,
}: {
  mesh: Pick<
    Mesh,
    | "id"
    | "label"
    | "channel_id"
    | "is_public"
    | "owner_id"
    | "source_id"
    | "discover_gateways"
    | "protocol"
    | "terms_accepted_version"
    | "terms_expires_at"
  >;
  open: boolean;
  onClose: () => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const { isOperator, meId } = useMe();
  // The API shows and accepts a source only from the mesh's owner, and only
  // operators have sources to pick; `/sources` lists just the caller's own.
  const canPickSource = isOperator && mesh.owner_id === meId;
  const sources = useQuery({ ...sourceRepository.list(), enabled: canPickSource });
  const currentSource = mesh.source_id ?? null;
  const sourceItems = [
    { label: formatMessage(DEFAULT_BROKER), value: NO_SOURCE },
    ...(sources.data ?? []).map((source) => ({ label: sourceTitle(source), value: source.id })),
    // Keep a current source the list doesn't include, so resending it stays valid.
    ...(currentSource && sources.data && !sources.data.some((source) => source.id === currentSource)
      ? [
          {
            label: formatMessage({ id: "feature.mesh.editDialog.currentSource", defaultMessage: "Current source" }),
            value: currentSource,
          },
        ]
      : []),
  ];
  const [errors, setErrors] = useState<Record<string, string>>({});
  const protocols = useQuery(meshRepository.protocols());
  const [protocol, setProtocol] = useState<string | null>(null);
  // The dialog stays mounted on the mesh page, so an unsaved pick is dropped on close.
  const close = () => {
    setProtocol(null);
    onClose();
  };
  const update = useMutation({
    ...meshRepository.update(),
    onSuccess: async (_saved, { data }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: meshRepository.listKey() }),
        queryClient.invalidateQueries({ queryKey: meshRepository.retrieveKey(mesh.id) }),
        // The mesh's protocol decides every device's `protocol_mismatch`.
        ...(data?.protocol === undefined
          ? []
          : [
              queryClient.invalidateQueries({ queryKey: meshRepository.devicesKey(mesh.id) }),
              queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/devices") }),
            ]),
      ]);
      close();
    },
    onError: (error) => setErrors(readApiError(error).fields),
  });
  const updateStatus = update.error ? readApiError(update.error).status : undefined;
  // Moving onto the default broker needs the mesh terms, unless the mesh holds a current acceptance.
  const { enforced: termsEnforced, current: currentTerms } = useMeshTerms();
  const termsCurrent = meshTermsCurrent(mesh, currentTerms?.version, new Date());
  const [awaitingTerms, setAwaitingTerms] = useState<{ meshId: string; data: MeshUpdate } | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const label = String(form.get("label") ?? "").trim();
    const channelId = String(form.get("channel_id") ?? "").trim();
    const psk = String(form.get("psk_b64") ?? "");
    // psk_b64 is only sent when the owner actually typed a new one — the
    // field starts blank (PSKs aren't echoed back to the client), and
    // MeshUpdate treats an absent key as "leave unchanged".
    const body: {
      label: string | null;
      channel_id: string;
      is_public: boolean;
      psk_b64?: string;
      source_id?: string | null;
      discover_gateways?: boolean;
      protocol?: string;
    } = {
      label: label === "" ? null : label,
      channel_id: channelId,
      is_public: form.get("is_public") === "on",
    };
    if (psk !== "") body.psk_b64 = psk;
    // Sent only on a change, so saving other fields isn't refused over a default PSK.
    const discover = form.get("discover_gateways") === "on";
    if (discover !== (mesh.discover_gateways ?? false)) body.discover_gateways = discover;
    // Only a change redistributes the mesh to its gateways.
    if (protocol !== null && protocol !== mesh.protocol) body.protocol = protocol;
    if (canPickSource) {
      const picked = String(form.get("source_id") ?? NO_SOURCE);
      const sourceId = picked === NO_SOURCE ? null : picked;
      // Only a change moves the gateways, so an unchanged source isn't resent.
      if (sourceId !== currentSource) body.source_id = sourceId;
    }
    const parsed = MeshUpdate.safeParse(body);
    if (!parsed.success) {
      setErrors(issueErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    if (termsEnforced && currentSource !== null && parsed.data?.source_id === null && !termsCurrent) {
      setAwaitingTerms({ meshId: mesh.id, data: parsed.data });
      return;
    }
    update.mutate({ meshId: mesh.id, data: parsed.data });
  }

  return (
    <Modal
      open={open}
      title={formatMessage(
        { id: "feature.mesh.editDialog.title", defaultMessage: "Edit mesh — {mesh}" },
        { mesh: meshTitle(mesh) },
      )}
      description={formatMessage({
        id: "feature.mesh.editDialog.description",
        defaultMessage: "Label, channel ID, pre-shared key, protocol, and its authorised viewers.",
      })}
      onClose={close}
    >
      <form key={mesh.id} className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
          <FormField
            id="mesh-edit-label"
            label={formatMessage({ id: "feature.mesh.editDialog.label", defaultMessage: "Label" })}
            error={errors.label}
          >
            <Input id="mesh-edit-label" name="label" autoComplete="off" defaultValue={mesh.label ?? ""} />
          </FormField>
          <FormField
            id="mesh-edit-channel"
            label={formatMessage({ id: "feature.mesh.editDialog.channelId", defaultMessage: "Channel ID" })}
            error={errors.channel_id}
          >
            <Input
              id="mesh-edit-channel"
              name="channel_id"
              required
              autoComplete="off"
              defaultValue={mesh.channel_id}
            />
          </FormField>
          <FormField
            id="mesh-edit-psk"
            label={formatMessage({ id: "feature.mesh.editDialog.psk", defaultMessage: "PSK" })}
            hint={formatMessage({
              id: "feature.mesh.editDialog.pskHint",
              defaultMessage: "Base64 channel key. Leave blank to keep the current key.",
            })}
            error={errors.psk_b64}
          >
            <Input id="mesh-edit-psk" name="psk_b64" type="password" autoComplete="new-password" />
          </FormField>
          <div className="flex flex-col gap-1">
            <FormCheckbox
              id="mesh-edit-public"
              name="is_public"
              label={formatMessage({ id: "feature.mesh.editDialog.public", defaultMessage: "Make this mesh public" })}
              defaultChecked={mesh.is_public ?? false}
            />
            <p className="pl-7 text-caption-1-regular text-text-tertiary">
              {formatMessage({
                id: "feature.mesh.editDialog.publicHint",
                defaultMessage:
                  "Anyone signed in can view its devices and readings. The PSK is private, and only you can change the mesh.",
              })}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <FormCheckbox
              id="mesh-edit-discover-gateways"
              name="discover_gateways"
              label={formatMessage({
                id: "feature.mesh.editDialog.discoverGateways",
                defaultMessage: "Add gateways automatically",
              })}
              defaultChecked={mesh.discover_gateways ?? false}
            />
            <p className="pl-7 text-caption-1-regular text-text-tertiary">
              {formatMessage({
                id: "feature.mesh.editDialog.discoverGatewaysHint",
                defaultMessage:
                  "Registers any gateway whose packets decode with this channel and PSK. Switching it off keeps the gateways already added. Only an operator can use it with a default or blank PSK.",
              })}
            </p>
          </div>
          <ProtocolField
            id="mesh-edit-protocol"
            protocols={protocols.data}
            failed={protocols.isError}
            onRetry={() => void protocols.refetch()}
            current={mesh.protocol ?? null}
            value={protocol}
            onValueChange={setProtocol}
            error={errors.protocol}
          />
          {canPickSource ? (
            <FormField
              id="mesh-edit-source"
              label={formatMessage({ id: "feature.mesh.editDialog.source", defaultMessage: "Source" })}
              hint={
                currentSource
                  ? formatMessage({
                      id: "feature.mesh.editDialog.sourceLeaveHint",
                      defaultMessage:
                        "Gateways are read only through the chosen broker. Moving this mesh off its source deletes the readings it stored from there after a grace period, so export them first if you need them.",
                    })
                  : formatMessage({
                      id: "feature.mesh.editDialog.sourceHint",
                      defaultMessage: "Gateways on this mesh are read only through the chosen broker.",
                    })
              }
              error={errors.source_id}
            >
              {sources.isPending ? (
                <StatusCopy>
                  {formatMessage({ id: "feature.mesh.editDialog.sourcesLoading", defaultMessage: "Loading sources" })}
                </StatusCopy>
              ) : (
                <FormSelect
                  id="mesh-edit-source"
                  name="source_id"
                  items={sourceItems}
                  defaultValue={currentSource ?? NO_SOURCE}
                />
              )}
            </FormField>
          ) : null}
        </FieldGroup>
        {update.error ? (
          <StatusCopy>
            {updateStatus === 502
              ? formatMessage({
                  id: "feature.mesh.editDialog.bridgeFailed",
                  defaultMessage: "The gateways could not be moved to the new source. Nothing changed. Try again.",
                })
              : formatMessage({
                  id: "feature.mesh.editDialog.error",
                  defaultMessage: "The mesh was not updated. Check the fields and try again.",
                })}
            {updateStatus !== 502 && formLevelMessage(update.error) ? ` ${formLevelMessage(update.error)}` : ""}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={close}>
            {formatMessage({ id: "feature.mesh.editDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" disabled={update.isPending}>
            {update.isPending
              ? formatMessage({ id: "feature.mesh.editDialog.saving", defaultMessage: "Saving" })
              : formatMessage({ id: "feature.mesh.editDialog.save", defaultMessage: "Save mesh" })}
          </Button>
        </div>
      </form>
      <TermsDialog
        open={awaitingTerms !== null}
        kind="mesh"
        onClose={() => setAwaitingTerms(null)}
        acceptLabel={formatMessage({
          id: "feature.mesh.editDialog.acceptTermsAndSave",
          defaultMessage: "Accept and save",
        })}
        onAccepted={(acceptance) => {
          if (!awaitingTerms) return;
          update.mutate(
            acceptance
              ? {
                  meshId: awaitingTerms.meshId,
                  data: { ...awaitingTerms.data, ...termsFields(acceptance) },
                }
              : awaitingTerms,
          );
          setAwaitingTerms(null);
        }}
      />
    </Modal>
  );
}
