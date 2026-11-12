import { Button } from "@mtt/ui/components/base/buttons/button";
import type { Mesh } from "@mtt/contracts";
import { MeshCreateRequest } from "@mtt/contracts";
import { formLevelMessage, issueErrors, readApiError } from "@mtt/contracts/errors";
import { MeshFormAlert, useMeshSubmitLabel, MeshForm as UiMeshForm, type MeshFormValues } from "@mtt/ui/forms/mesh-form";
import { ProtocolField } from "@mtt/ui/forms/protocol-field";
import { TermsChecklist } from "@mtt/ui/forms/terms-checklist";
import { allStatementsAccepted, termsLocale, useTermsEnforced } from "@mtt/contracts/terms";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type ReactElement, type ReactNode, useId, useState } from "react";
import { useIntl } from "react-intl";
import { meshRepository } from "@/features/mesh/repository";
import { termsRepository } from "@/features/terms/repository";

export function MeshForm({
  onCreated,
  children,
}: {
  onCreated: (mesh: Mesh) => void;
  children: (fields: ReactNode, footer: ReactNode) => ReactElement;
}): ReactElement {
  const formId = useId();
  const { formatMessage, locale } = useIntl();
  const termsOff = useTermsEnforced() === false;
  const terms = useQuery({
    ...termsRepository.mesh({ locale: termsLocale(locale) }),
    enabled: !termsOff,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const protocols = useQuery(meshRepository.protocols());
  const [protocol, setProtocol] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set());
  const [termsMissing, setTermsMissing] = useState(false);
  const create = useMutation({
    ...meshRepository.create(),
    onSuccess: async (mesh) => {
      await onCreated(mesh);
    },
    onError: (error) => setErrors(readApiError(error).fields),
  });
  const statements = terms.data?.statements ?? [];
  const termsNotRequired = terms.error ? readApiError(terms.error).status === 404 : false;
  const submitLabel = useMeshSubmitLabel(create.isPending);

  function submitParsed(values: MeshFormValues, acceptance: { version: string; locale: "en" | "es" } | null) {
    const parsed = MeshCreateRequest.safeParse({
      channel_id: values.channel_id,
      psk_b64: values.psk_b64,
      label: values.label === "" ? null : values.label,
      discover_gateways: false,
      ...(protocol !== null ? { protocol } : {}),
      ...(acceptance ? { terms_version: acceptance.version, terms_locale: acceptance.locale } : {}),
    });
    if (!parsed.success) {
      setErrors(issueErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    create.mutate({ data: parsed.data });
  }

  function onSubmit(values: MeshFormValues) {
    if (create.isPending) return;
    if (termsOff || termsNotRequired) {
      submitParsed(values, null);
      return;
    }
    if (!terms.data) return;
    const acceptedAll = allStatementsAccepted(statements.map((statement) => statement.id), accepted);
    setTermsMissing(!acceptedAll);
    if (acceptedAll) submitParsed(values, { version: terms.data.version, locale: termsLocale(terms.data.locale) });
  }

  return children(
      <UiMeshForm
        errors={errors}
        pending={create.isPending}
        onSubmit={onSubmit}
        formId={formId}
        extraFields={
          <ProtocolField
            id="start-mesh-protocol"
            protocols={protocols.data}
            current={null}
            value={protocol}
            onValueChange={setProtocol}
            error={errors.protocol}
          />
        }
      />,
      <>
          {terms.data && !termsOff && !termsNotRequired ? (
            <div className="flex flex-col gap-3">
              <TermsChecklist
                idPrefix="mesh-terms"
                statements={statements}
                accepted={accepted}
                onToggle={(id, checked) => {
                  setAccepted((current) => {
                    const next = new Set(current);
                    if (checked) next.add(id);
                    else next.delete(id);
                    return next;
                  });
                  setTermsMissing(false);
                }}
                footnote={
                  <a className="underline" href="/terms" target="_blank" rel="noreferrer">
                    {formatMessage({ id: "feature.terms.termsLink", defaultMessage: "Read the Mesh Things Terms." })}
                  </a>
                }
              />
              {termsMissing ? (
                <p className="text-caption-1-regular text-accent-500" role="alert">
                  {formatMessage({ id: "page.start.mesh.termsRequired", defaultMessage: "Accept each statement to create the mesh." })}
                </p>
              ) : null}
            </div>
          ) : null}
        <Button type="submit" form={formId} size="medium" disabled={create.isPending}>
          {submitLabel}
        </Button>
      {create.error ? <MeshFormAlert detail={formLevelMessage(create.error)} /> : null}
      </>,
  );
}
