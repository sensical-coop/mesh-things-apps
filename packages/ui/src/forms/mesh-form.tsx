import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { type FormEvent, type ReactElement, type ReactNode, useState } from "react";
import { useIntl } from "react-intl";
import { dialogActionsClass } from "@mtt/ui/forms/dialog-actions";
import { fieldErrorId, fieldHintId, FormField } from "@mtt/ui/forms/form-field";

/** Meshtastic's published default channel key. Traffic on it is readable by anyone. */
const PUBLIC_DEFAULT_PSK = "AQ==";

export type MeshFormValues = { label: string | null; channel_id: string; psk_b64: string };

export function useMeshSubmitLabel(pending: boolean): string {
  const { formatMessage } = useIntl();
  if (pending) return formatMessage({ id: "page.meshes.list.createDialog.creating", defaultMessage: "Creating mesh" });
  return formatMessage({ id: "page.meshes.list.createDialog.submit", defaultMessage: "Create mesh" });
}

export function MeshFormAlert({ detail }: { detail?: string }): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <p className="text-body-medium text-text-secondary" role="alert">
      {formatMessage({
        id: "page.meshes.list.createDialog.error",
        defaultMessage: "The mesh was not created. Check the fields and try again.",
      })}
      {detail ? ` ${detail}` : ""}
    </p>
  );
}

export function MeshForm({
  errors,
  pending,
  onSubmit,
  extraFields,
  onCancel,
  formId,
}: {
  errors?: Record<string, string | undefined>;
  pending: boolean;
  onSubmit: (values: MeshFormValues) => void;
  /** Console-only fields (broker, discovery), rendered after the shared ones. */
  extraFields?: ReactNode;
  onCancel?: () => void;
  /** Renders no actions: a submit button elsewhere on the page targets the form with `form={formId}`. */
  formId?: string;
}): ReactElement {
  const { formatMessage } = useIntl();
  const submitLabel = useMeshSubmitLabel(pending);
  const [psk, setPsk] = useState("");
  const publicPsk = psk === PUBLIC_DEFAULT_PSK;
  const pskDescribed = [publicPsk ? "mesh-psk-public" : null, errors?.psk_b64 ? fieldErrorId("mesh-psk") : null]
    .filter(Boolean)
    .join(" ") || undefined;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const label = String(form.get("label") ?? "").trim();
    onSubmit({
      label: label === "" ? null : label,
      channel_id: String(form.get("channel_id") ?? "").trim(),
      psk_b64: String(form.get("psk_b64") ?? ""),
    });
  }

  return (
    <form id={formId} className="flex flex-col gap-5" onSubmit={submit}>
      <FieldGroup className="gap-3">
        <FormField
          id="mesh-label"
          label={formatMessage({ id: "page.meshes.list.createDialog.label", defaultMessage: "Label" })}
          hint={formatMessage({
            id: "page.meshes.list.createDialog.labelHint",
            defaultMessage: "Optional name shown in the console instead of the channel ID, for reference only.",
          })}
          error={errors?.label}
        >
          <Input id="mesh-label" name="label" autoComplete="off" aria-invalid={errors?.label ? true : undefined} aria-describedby={errors?.label ? fieldErrorId("mesh-label") : fieldHintId("mesh-label")} />
        </FormField>
        <FormField
          id="mesh-channel"
          label={formatMessage({ id: "page.meshes.list.createDialog.channelId", defaultMessage: "Channel ID" })}
          hint={formatMessage({
            id: "page.meshes.list.createDialog.channelIdHint",
            defaultMessage: "The Meshtastic channel name.",
          })}
          error={errors?.channel_id}
        >
          <Input
            id="mesh-channel"
            name="channel_id"
            required
            autoComplete="off"
            aria-invalid={errors?.channel_id ? true : undefined}
            aria-describedby={errors?.channel_id ? fieldErrorId("mesh-channel") : fieldHintId("mesh-channel")}
          />
        </FormField>
        <FormField
          id="mesh-psk"
          label={formatMessage({ id: "page.meshes.list.createDialog.psk", defaultMessage: "PSK" })}
          hint={formatMessage({
            id: "page.meshes.list.createDialog.pskHint",
            defaultMessage: "The channel's pre-shared key, in Base64.",
          })}
          error={errors?.psk_b64}
        >
          <Input
            id="mesh-psk"
            name="psk_b64"
            type="password"
            required
            autoComplete="new-password"
            aria-invalid={errors?.psk_b64 ? true : undefined}
            aria-describedby={pskDescribed}
            onChange={(event) => setPsk(event.currentTarget.value)}
          />
        </FormField>
        {publicPsk ? (
          <p id="mesh-psk-public" className="text-caption-1-regular text-accent-500" role="status">
            {formatMessage(
              {
                id: "page.meshes.list.createDialog.publicPsk",
                defaultMessage: "{psk} is the public default key. Anyone can read this channel.",
              },
              { psk: PUBLIC_DEFAULT_PSK },
            )}
          </p>
        ) : null}
        {extraFields}
      </FieldGroup>
      {formId ? null : (
        <div className={dialogActionsClass}>
          {onCancel ? (
            <Button type="button" variant="secondary" size="small" onClick={onCancel}>
              {formatMessage({ id: "common.cancel", defaultMessage: "Cancel" })}
            </Button>
          ) : null}
          <Button type="submit" size="small" disabled={pending}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
