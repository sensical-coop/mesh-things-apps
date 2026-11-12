import type { Mesh } from "@mtt/contracts";
import { formLevelMessage, readApiError } from "@mtt/contracts/errors";
import { meshCreateBody } from "@mtt/contracts/mesh";
import { termsFields, useTermsAsked, type TermsAcceptance } from "@mtt/contracts/terms";
import { MeshFormAlert, MeshForm as UiMeshForm, type MeshFormValues } from "@mtt/ui/forms/mesh-form";
import { FormCheckbox } from "@mtt/ui/forms/form-checkbox";
import { FormField } from "@mtt/ui/forms/form-field";
import { FormSelect } from "@mtt/ui/forms/form-select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { useMe } from "@/features/auth/use-me";
import { DEFAULT_BROKER, NO_SOURCE } from "@/features/mesh/model";
import { meshRepository } from "@/features/mesh/repository";
import { ProtocolField } from "@mtt/ui/forms/protocol-field";
import { sourceTitle } from "@/features/source/model";
import { sourceRepository } from "@/features/source/repository";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";

export function MeshForm({
  sourceId = null,
  termsAcceptance = null,
  onCreated,
  onCancel,
}: {
  /** Broker chosen before the form opened. */
  sourceId?: string | null;
  termsAcceptance?: TermsAcceptance | null;
  onCreated?: (mesh: Mesh) => void | Promise<void>;
  onCancel?: () => void;
}): ReactElement {
  const termsEnforced = useTermsAsked();
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [discover, setDiscover] = useState(false);
  const protocols = useQuery(meshRepository.protocols());
  const [protocol, setProtocol] = useState<string | null>(null);
  const { isOperator } = useMe();
  const showBrokerFields = isOperator;
  const sources = useQuery({ ...sourceRepository.list(), enabled: showBrokerFields });
  const [source, setSource] = useState(sourceId ?? NO_SOURCE);
  const sourceItems = [
    { label: formatMessage(DEFAULT_BROKER), value: NO_SOURCE },
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
    const body = meshCreateBody(values, {
      discover_gateways: discover,
      ...(protocol !== null ? { protocol } : {}),
      ...(showBrokerFields && picked !== NO_SOURCE ? { source_id: picked } : {}),
      terms: picked === NO_SOURCE ? termsAcceptance : null,
    });
    if ("errors" in body) {
      setErrors(body.errors);
      return;
    }
    setErrors({});
    if (termsEnforced && picked === NO_SOURCE && !termsAcceptance) {
      setAwaitingTerms(body);
      return;
    }
    create.mutate(body);
  }

  return (
    <>
      <UiMeshForm
        errors={errors}
        pending={create.isPending}
        onCancel={onCancel}
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
            <ProtocolField
              id="mesh-protocol"
              protocols={protocols.data}
              failed={protocols.isError}
              onRetry={() => void protocols.refetch()}
              current={null}
              value={protocol}
              onValueChange={setProtocol}
              error={errors.protocol}
            />
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
              <MeshFormAlert
                detail={[
                  formLevelMessage(create.error),
                  errors.terms_version
                    ? formatMessage({
                        id: "page.meshes.list.createDialog.termsChanged",
                        defaultMessage: "The mesh terms changed. Close this dialog and accept the current terms.",
                      })
                    : undefined,
                ]
                  .filter((part) => part)
                  .join(" ")}
              />
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
              ? { data: { ...awaitingTerms.data, ...termsFields(acceptance) } }
              : awaitingTerms,
          );
          setAwaitingTerms(null);
        }}
      />
    </>
  );
}
