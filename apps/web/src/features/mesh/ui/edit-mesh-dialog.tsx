import type { Mesh } from "@mtt/contracts";
import { zMeshesUpdateData } from "@mtt/contracts/zod";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormCheckbox } from "@/components/form/form-checkbox";
import { FormField } from "@/components/form/form-field";
import { FormSelect } from "@/components/form/form-select";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { formLevelMessage, issueErrors, readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { useMe } from "@/features/auth/use-me";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";
import { sourceTitle } from "@/features/source/model";
import { sourceRepository } from "@/features/source/repository";
import { termsLocale, termsStanding } from "@/features/terms/model";
import { termsRepository } from "@/features/terms/repository";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";
import { useTermsEnforced } from "@/features/terms/use-terms-enforced";

/** Select value for "no source": the instance's own broker. */
const DEFAULT_BROKER = "default";

export function EditMeshDialog({
  mesh,
  open,
  onClose,
  onSaved,
}: {
  mesh: Pick<
    Mesh,
    "id" | "label" | "channel_id" | "is_public" | "owner_id" | "source_id" | "terms_accepted_version" | "terms_expires_at"
  >;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}): ReactElement {
  const { formatMessage, locale } = useIntl();
  const queryClient = useQueryClient();
  const { isOperator, meId } = useMe();
  // The API shows and accepts a source only from the mesh's owner, and only
  // operators have sources to pick; `/sources` lists just the caller's own.
  const canPickSource = isOperator && mesh.owner_id === meId;
  const sources = useQuery({ ...sourceRepository.list(), enabled: canPickSource });
  const currentSource = mesh.source_id ?? null;
  const sourceItems = [
    {
      label: formatMessage({ id: "feature.mesh.editDialog.defaultBroker", defaultMessage: "Default broker" }),
      value: DEFAULT_BROKER,
    },
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
  const update = useMutation({
    ...meshRepository.update(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meshRepository.listKey() });
      await queryClient.invalidateQueries({
        queryKey: meshRepository.retrieveKey({ path: { mesh_id: mesh.id } }),
      });
      await onSaved?.();
      onClose();
    },
    onError: (error) => setErrors(readApiError(error).fields),
  });
  const updateStatus = update.error ? readApiError(update.error).status : undefined;
  // Moving onto the default broker needs the mesh terms, unless the mesh holds a current acceptance.
  // A self-hosted instance asks for no terms; unknown counts as enforced.
  const enforced = useTermsEnforced();
  const termsEnforced = enforced !== false;
  const meshTerms = useQuery({
    ...termsRepository.mesh({ query: { locale: termsLocale(locale) } }),
    enabled: enforced === true && canPickSource && currentSource !== null,
  });
  const termsCurrent = ["ok", "expiring"].includes(
    termsStanding({
      acceptedVersion: mesh.terms_accepted_version ?? null,
      expiresAt: mesh.terms_expires_at ?? null,
      pausedAt: null,
      currentVersion: meshTerms.data?.version,
      now: new Date(),
    }),
  );
  const [awaitingTerms, setAwaitingTerms] = useState<Parameters<typeof update.mutate>[0] | null>(null);

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
    } = {
      label: label === "" ? null : label,
      channel_id: channelId,
      is_public: form.get("is_public") === "on",
    };
    if (psk !== "") body.psk_b64 = psk;
    if (canPickSource) {
      const picked = String(form.get("source_id") ?? DEFAULT_BROKER);
      const sourceId = picked === DEFAULT_BROKER ? null : picked;
      // Only a change moves the gateways, so an unchanged source isn't resent.
      if (sourceId !== currentSource) body.source_id = sourceId;
    }
    const parsed = zMeshesUpdateData.safeParse({ path: { mesh_id: mesh.id }, body });
    if (!parsed.success) {
      setErrors(issueErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    if (termsEnforced && currentSource !== null && parsed.data.body?.source_id === null && !termsCurrent) {
      setAwaitingTerms(parsed.data);
      return;
    }
    update.mutate(parsed.data);
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
        defaultMessage: "Label, channel ID, pre-shared key, and its authorised viewers.",
      })}
      onClose={onClose}
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
                  defaultValue={currentSource ?? DEFAULT_BROKER}
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
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
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
                  ...awaitingTerms,
                  body: { ...awaitingTerms.body, terms_version: acceptance.version, terms_locale: acceptance.locale },
                }
              : awaitingTerms,
          );
          setAwaitingTerms(null);
        }}
      />
    </Modal>
  );
}
