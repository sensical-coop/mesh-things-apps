import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { type FormEvent, type ReactElement, type ReactNode, useState } from "react";
import { FormField } from "@mtt/ui/forms/form-field";

/** Meshtastic's published default channel key. Traffic on it is readable by anyone. */
export const PUBLIC_DEFAULT_PSK = "AQ==";

const actionsClass =
  "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto";

export type MeshFormValues = { label: string; channel_id: string; psk_b64: string };

export type MeshFormLabels = {
  label: string;
  labelHint: string;
  channel: string;
  channelHint: string;
  psk: string;
  pskHint: string;
  publicPsk: string;
};

export function MeshForm({
  labels,
  errors,
  pending,
  submitLabel,
  onSubmit,
  extraFields,
  onCancel,
  cancelLabel,
  formId,
}: {
  labels: MeshFormLabels;
  errors?: Record<string, string | undefined>;
  pending: boolean;
  submitLabel: string;
  onSubmit: (values: MeshFormValues) => void;
  /** Console-only fields (broker, discovery), rendered after the shared ones. */
  extraFields?: ReactNode;
  onCancel?: () => void;
  cancelLabel?: string;
  /** Renders no actions: a submit button elsewhere on the page targets the form with `form={formId}`. */
  formId?: string;
}): ReactElement {
  const [psk, setPsk] = useState("");
  const publicPsk = psk === PUBLIC_DEFAULT_PSK;
  const pskDescribed = [publicPsk ? "mesh-psk-public" : null, errors?.psk_b64 ? "mesh-psk-error" : null]
    .filter(Boolean)
    .join(" ") || undefined;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const label = String(form.get("label") ?? "").trim();
    onSubmit({
      label,
      channel_id: String(form.get("channel_id") ?? "").trim(),
      psk_b64: String(form.get("psk_b64") ?? ""),
    });
  }

  return (
    <form id={formId} className="flex flex-col gap-5" onSubmit={submit}>
      <FieldGroup className="gap-3">
        <FormField id="mesh-label" label={labels.label} hint={labels.labelHint} error={errors?.label}>
          <Input id="mesh-label" name="label" autoComplete="off" aria-invalid={errors?.label ? true : undefined} aria-describedby={errors?.label ? "mesh-label-error" : "mesh-label-hint"} />
        </FormField>
        <FormField id="mesh-channel" label={labels.channel} hint={labels.channelHint} error={errors?.channel_id}>
          <Input
            id="mesh-channel"
            name="channel_id"
            required
            autoComplete="off"
            aria-invalid={errors?.channel_id ? true : undefined}
            aria-describedby={errors?.channel_id ? "mesh-channel-error" : "mesh-channel-hint"}
          />
        </FormField>
        <FormField id="mesh-psk" label={labels.psk} hint={labels.pskHint} error={errors?.psk_b64}>
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
            {labels.publicPsk}
          </p>
        ) : null}
        {extraFields}
      </FieldGroup>
      {formId ? null : (
        <div className={actionsClass}>
          {onCancel ? (
            <Button type="button" variant="secondary" size="small" onClick={onCancel}>
              {cancelLabel}
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
