import { MeshCreateRequest, type Mesh } from "@mtt/contracts";
import { formLevelMessage, issueErrors, readApiError } from "@mtt/contracts/errors";
import { useTermsEnforced } from "@mtt/contracts/terms";
import { MeshForm as UiMeshForm, PUBLIC_DEFAULT_PSK, type MeshFormValues } from "@mtt/ui/forms/mesh-form";
import { FormCheckbox } from "@mtt/ui/forms/form-checkbox";
import { FormField } from "@mtt/ui/forms/form-field";
import { FormSelect } from "@mtt/ui/forms/form-select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { StatusCopy } from "@/components/status-copy";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { NO_SOURCE } from "@/features/mesh/model";
import { meshRepository } from "@/features/mesh/repository";
import { sourceTitle } from "@/features/source/model";
import { sourceRepository } from "@/features/source/repository";
import { type TermsAcceptance } from "@/features/terms/model";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";

export function MeshForm({
  sourceId = null,
  termsAcceptance = null,
  submitLabel,
  onCreated,
  onCancel,
}: {
  /** Broker chosen before the form opened. */
  sourceId?: string | null;
  termsAcceptance?: TermsAcceptance | null;
  /** Idle submit label. Pending state keeps "Creating mesh". */
  submitLabel?: string;
  onCreated?: (mesh: Mesh) => void | Promise<void>;
  onCancel?: () => void;
}): ReactElement {
  const termsEnforced = useTermsEnforced() !== false;
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [discover, setDiscover] = useState(false);
  const { isOperator } = useOwnerDirectory();
  const showBrokerFields = isOperator;
  const sources = useQuery({ ...sourceRepository.list(), enabled: showBrokerFields });
  const [source, setSource] = useState(sourceId ?? NO_SOURCE);
  const sourceItems = [
    {
      label: formatMessage({ id: "page.meshes.list.createDialog.defaultBroker", defaultMessage: "Default broker" }),
      value: NO_SOURCE,
    },
    ...(sources.data ?? []).map((item) => ({ label: sourceTitle(item), value: item.id })),
  ];
  const create = useMutation({
    ...meshRepository.create(),
    onSuccess: async (mesh) => {
      await queryClient.invalidateQueries({ queryKey: meshRepository.listKey() });
      await onCreated?.(mesh);
    },
    onError: (error) => setErrors(readApiError(error).fields),
  });
  const [awaitingTerms, setAwaitingTerms] = useState<Parameters<typeof create.mutate>[0] | null>(null);

  function onSubmit(values: MeshFormValues) {
    if (create.isPending) return;
    const picked = source;
    const parsed = MeshCreateRequest.safeParse({
      channel_id: values.channel_id,
      psk_b64: values.psk_b64,
      label: values.label === "" ? null : values.label,
      discover_gateways: discover,
      ...(showBrokerFields && picked !== NO_SOURCE ? { source_id: picked } : {}),
      ...(picked === NO_SOURCE && termsAcceptance
        ? { terms_version: termsAcceptance.version, terms_locale: termsAcceptance.locale }
        : {}),
    });
    if (!parsed.success) {
      setErrors(issueErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    if (termsEnforced && picked === NO_SOURCE && !termsAcceptance) {
      setAwaitingTerms({ data: parsed.data });
      return;
    }
    create.mutate({ data: parsed.data });
  }

  const cancelLabel = formatMessage({ id: "page.meshes.list.createDialog.cancel", defaultMessage: "Cancel" });

  return (
    <>
      <UiMeshForm
        labels={{
          label: formatMessage({ id: "page.meshes.list.createDialog.label", defaultMessage: "Label" }),
          labelHint: formatMessage({
            id: "page.meshes.list.createDialog.labelHint",
            defaultMessage: "Optional name shown in the console instead of the channel ID, for reference only.",
          }),
          channel: formatMessage({ id: "page.meshes.list.createDialog.channelId", defaultMessage: "Channel ID" }),
          channelHint: formatMessage({
            id: "page.meshes.list.createDialog.channelIdHint",
            defaultMessage: "The Meshtastic channel name.",
          }),
          psk: formatMessage({ id: "page.meshes.list.createDialog.psk", defaultMessage: "PSK" }),
          pskHint: formatMessage({
            id: "page.meshes.list.createDialog.pskHint",
            defaultMessage: "The channel's pre-shared key, in Base64.",
          }),
          publicPsk: formatMessage(
            {
              id: "page.meshes.list.createDialog.publicPsk",
              defaultMessage: "{psk} is the public default key. Anyone can read this channel.",
            },
            { psk: PUBLIC_DEFAULT_PSK },
          ),
        }}
        errors={errors}
        pending={create.isPending}
        submitLabel={
          create.isPending
            ? formatMessage({ id: "page.meshes.list.createDialog.creating", defaultMessage: "Creating mesh" })
            : (submitLabel ?? formatMessage({ id: "page.meshes.list.createDialog.title", defaultMessage: "Create mesh" }))
        }
        onCancel={onCancel}
        cancelLabel={cancelLabel}
        onSubmit={onSubmit}
        extraFields={
          <>
            <div className="flex flex-col gap-1">
                <FormCheckbox
                  id="mesh-discover-gateways"
                  name="discover_gateways"
                  checked={discover}
                  onCheckedChange={setDiscover}
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
            {showBrokerFields ? (
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
                  value={source}
                  onValueChange={setSource}
                />
              </FormField>
            ) : null}
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
          </>
        }
      />
      <TermsDialog
        open={awaitingTerms !== null}
        kind="mesh"
        onClose={() => setAwaitingTerms(null)}
        acceptLabel={formatMessage({ id: "page.meshes.list.createDialog.acceptAndCreate", defaultMessage: "Accept and create" })}
        onAccepted={(acceptance) => {
          if (!awaitingTerms) return;
          create.mutate(
            acceptance
              ? { data: { ...awaitingTerms.data, terms_version: acceptance.version, terms_locale: acceptance.locale } }
              : awaitingTerms,
          );
          setAwaitingTerms(null);
        }}
      />
    </>
  );
}
