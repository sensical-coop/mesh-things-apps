import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { type FormEvent, type ReactElement } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@mtt/ui/forms/form-field";
import { NodeIdField } from "@mtt/ui/forms/node-id-field";
import { parseNodeId } from "@mtt/ui/forms/node-id";

const actionsClass =
  "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto";

export type GatewayFormValues = { node_id: number; label: string };

export function GatewayForm({
  errors,
  pending,
  failed = false,
  alertDetail,
  onSubmit,
  onCancel,
  cancelLabel,
  layout = "dialog",
}: {
  errors?: Record<string, string | undefined>;
  pending: boolean;
  failed?: boolean;
  alertDetail?: string;
  onSubmit: (values: GatewayFormValues) => void;
  onCancel?: () => void;
  cancelLabel?: string;
  /** `dialog`: compact actions aligned right. `page`: one full-width submit, like the other page actions. */
  layout?: "dialog" | "page";
}): ReactElement {
  const { formatMessage } = useIntl();
  const submitLabel = pending
    ? formatMessage({
        id: "page.meshes.detail.registerGatewayDialog.registering",
        defaultMessage: "Registering gateway",
      })
    : formatMessage({
        id: "page.meshes.detail.registerGatewayDialog.submit",
        defaultMessage: "Register gateway",
      });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const nodeId = parseNodeId(String(form.get("node_id") ?? ""), "decimal");
    if (nodeId === null) return;
    const label = String(form.get("label") ?? "").trim();
    onSubmit({ node_id: nodeId, label });
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <FieldGroup>
        <FormField
          id="device-label"
          label={formatMessage({ id: "page.meshes.detail.registerGatewayDialog.label", defaultMessage: "Label" })}
          error={errors?.label}
        >
          <Input
            id="device-label"
            name="label"
            autoComplete="off"
            aria-invalid={errors?.label ? true : undefined}
            aria-describedby={errors?.label ? "device-label-error" : undefined}
          />
        </FormField>
        <NodeIdField id="device-node" name="node_id" error={errors?.node_id} />
      </FieldGroup>
      <div className={layout === "page" ? "flex flex-col gap-2" : actionsClass}>
        {onCancel ? (
          <Button type="button" variant="secondary" size="small" onClick={onCancel}>
            {cancelLabel}
          </Button>
        ) : null}
        <Button type="submit" size={layout === "page" ? "medium" : "small"} disabled={pending}>
          {submitLabel}
        </Button>
      </div>
      {failed ? (
        <p className="text-body-medium text-text-secondary" role="alert">
          {formatMessage({
            id: "page.meshes.detail.registerGatewayDialog.error",
            defaultMessage: "The gateway was not registered. Check the node ID and try again.",
          })}
          {alertDetail ? ` ${alertDetail}` : ""}
        </p>
      ) : null}
    </form>
  );
}
