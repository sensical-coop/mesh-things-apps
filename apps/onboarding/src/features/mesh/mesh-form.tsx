import type { Mesh } from "@mtt/contracts";
import { formLevelMessage, readApiError } from "@mtt/contracts/errors";
import { meshCreateBody } from "@mtt/contracts/mesh";
import { SITE_PATHS } from "@mtt/contracts/site";
import { termsLocale, useTermsAcceptance, useTermsAsked } from "@mtt/contracts/terms";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { MeshFormAlert, useMeshSubmitLabel, MeshForm as UiMeshForm, type MeshFormValues } from "@mtt/ui/forms/mesh-form";
import { ProtocolField } from "@mtt/ui/forms/protocol-field";
import { TermsChecklist } from "@mtt/ui/forms/terms-checklist";
import { TermsLink } from "@mtt/ui/forms/terms-link";
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
  const termsOff = !useTermsAsked();
  const terms = useQuery({
    ...termsRepository.mesh({ locale: termsLocale(locale) }),
    enabled: !termsOff,
  });
  const termsState = useTermsAcceptance(terms);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const protocols = useQuery(meshRepository.protocols());
  const [protocol, setProtocol] = useState<string | null>(null);
  const [termsMissing, setTermsMissing] = useState(false);
  const create = useMutation({
    ...meshRepository.create(),
    onSuccess: (mesh) => onCreated(mesh),
    onError: (error) => setErrors(readApiError(error).fields),
  });
  const submitLabel = useMeshSubmitLabel(create.isPending);
  const termsRequired = !termsOff && !termsState.notRequired;

  function onSubmit(values: MeshFormValues) {
    if (create.isPending) return;
    if (termsRequired) {
      if (!terms.data) return;
      setTermsMissing(!termsState.complete);
      if (!termsState.complete) return;
    }
    const body = meshCreateBody(values, {
      discover_gateways: false,
      ...(protocol !== null ? { protocol } : {}),
      terms: termsRequired ? termsState.acceptance : null,
    });
    if ("errors" in body) {
      setErrors(body.errors);
      return;
    }
    setErrors({});
    create.mutate(body);
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
      {terms.data && termsRequired ? (
        <div className="flex flex-col gap-3">
          <TermsChecklist
            idPrefix="mesh-terms"
            statements={terms.data.statements}
            accepted={termsState.accepted}
            onToggle={(id, checked) => {
              termsState.toggle(id, checked);
              setTermsMissing(false);
            }}
            footnote={
              <>
                {terms.data.footnote}{" "}
                <TermsLink href={SITE_PATHS.terms} />
              </>
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
