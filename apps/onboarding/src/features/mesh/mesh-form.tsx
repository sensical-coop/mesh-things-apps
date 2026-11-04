import type { Mesh } from "@mtt/contracts";
import { MeshCreateRequest } from "@mtt/contracts";
import { formLevelMessage, issueErrors, readApiError } from "@mtt/contracts/errors";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { MeshForm as UiMeshForm, type MeshFormValues } from "@mtt/ui/forms/mesh-form";
import { TermsChecklist } from "@mtt/ui/forms/terms-checklist";
import { allStatementsAccepted, termsLocale } from "@mtt/ui/terms";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { meshRepository } from "@/features/mesh/repository";
import { termsRepository } from "@/features/terms/repository";
import { useTermsEnforced } from "@/features/terms/use-terms-enforced";

export function MeshForm({ onCreated }: { onCreated: (mesh: Mesh) => void }): ReactElement {
  const { formatMessage, locale } = useIntl();
  const termsOff = useTermsEnforced() === false;
  const terms = useQuery({
    ...termsRepository.mesh({ locale: termsLocale(locale) }),
    enabled: !termsOff,
    retry: (failures: number, error: unknown) => readApiError(error).status !== 404 && failures < 3,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set());
  const [pendingValues, setPendingValues] = useState<MeshFormValues | null>(null);
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
    setPendingValues(values);
    if (allStatementsAccepted(statements.map((statement) => statement.id), accepted)) {
      submitParsed(values, { version: terms.data.version, locale: termsLocale(terms.data.locale) });
    }
  }

  return (
    <div className="flex flex-col gap-5">
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
          publicPsk: formatMessage({
            id: "page.meshes.list.createDialog.publicPsk",
            defaultMessage: "AQ== is the public default key. Anyone can read this channel.",
          }),
        }}
        errors={errors}
        pending={create.isPending}
        submitLabel={
          create.isPending
            ? formatMessage({ id: "page.meshes.list.createDialog.creating", defaultMessage: "Creating mesh" })
            : formatMessage({ id: "page.meshes.list.createDialog.title", defaultMessage: "Create mesh" })
        }
        onSubmit={onSubmit}
      />
      {pendingValues && terms.data && !termsOff && !termsNotRequired ? (
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
            }}
            footnote={
              <a className="underline" href="/terms" target="_blank" rel="noreferrer">
                {formatMessage({ id: "feature.terms.termsLink", defaultMessage: "Read the Mesh Things Terms." })}
              </a>
            }
          />
          <Button
            type="button"
            size="small"
            disabled={!allStatementsAccepted(statements.map((statement) => statement.id), accepted) || create.isPending}
            onClick={() =>
              submitParsed(pendingValues, { version: terms.data.version, locale: termsLocale(terms.data.locale) })
            }
          >
            {formatMessage({ id: "page.meshes.list.createDialog.acceptAndCreate", defaultMessage: "Accept and create" })}
          </Button>
        </div>
      ) : null}
      {create.error ? (
        <p className="text-body-medium text-text-secondary" role="alert">
          {formatMessage({
            id: "page.meshes.list.createDialog.error",
            defaultMessage: "The mesh was not created. Check the fields and try again.",
          })}
          {formLevelMessage(create.error) ? ` ${formLevelMessage(create.error)}` : ""}
        </p>
      ) : null}
    </div>
  );
}
