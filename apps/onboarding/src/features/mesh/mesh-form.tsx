import { Button } from "@mtt/ui/components/base/buttons/button";
import type { Mesh } from "@mtt/contracts";
import { MeshCreateRequest } from "@mtt/contracts";
import { formLevelMessage, issueErrors, readApiError } from "@mtt/contracts/errors";
import { MeshForm as UiMeshForm, PUBLIC_DEFAULT_PSK, type MeshFormValues } from "@mtt/ui/forms/mesh-form";
import { TermsChecklist } from "@mtt/ui/forms/terms-checklist";
import { allStatementsAccepted, termsLocale, useTermsEnforced } from "@mtt/contracts/terms";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type ReactElement, type ReactNode, useId, useState } from "react";
import { useIntl } from "react-intl";
import { meshRepository } from "@/features/mesh/repository";
import { termsRepository } from "@/features/terms/repository";

/** `children` places the fields and the footer (terms, submit, error), which may sit apart in the layout. */
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

  function submitParsed(values: MeshFormValues, acceptance: { version: string; locale: "en" | "es" } | null) {
    const parsed = MeshCreateRequest.safeParse({
      channel_id: values.channel_id,
      psk_b64: values.psk_b64,
      label: values.label === "" ? null : values.label,
      discover_gateways: false,
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

  const submitLabel = create.isPending
    ? formatMessage({ id: "page.meshes.list.createDialog.creating", defaultMessage: "Creating mesh" })
    : formatMessage({ id: "page.meshes.list.createDialog.title", defaultMessage: "Create mesh" });

  return children(
      <UiMeshForm
        labels={{
          label: formatMessage({ id: "page.meshes.list.createDialog.label", defaultMessage: "Name" }),
          labelHint: formatMessage({
            id: "page.meshes.list.createDialog.labelHint",
            defaultMessage: "Optional. The console shows this instead of the channel name.",
          }),
          channel: formatMessage({ id: "page.meshes.list.createDialog.channelId", defaultMessage: "Channel name" }),
          channelHint: formatMessage({
            id: "page.meshes.list.createDialog.channelIdHint",
            defaultMessage: "The channel name in the Meshtastic app.",
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
        submitLabel={submitLabel}
        onSubmit={onSubmit}
        formId={formId}
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
      {create.error ? (
        <p className="text-body-medium text-text-secondary" role="alert">
          {formatMessage({
            id: "page.meshes.list.createDialog.error",
            defaultMessage: "The mesh was not created. Check the fields and try again.",
          })}
          {formLevelMessage(create.error) ? ` ${formLevelMessage(create.error)}` : ""}
        </p>
      ) : null}
      </>,
  );
}
