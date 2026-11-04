import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { type FormEvent, type ReactElement } from "react";
import { FormField } from "@mtt/ui/forms/form-field";
import { NodeIdField, type NodeIdFieldLabels } from "@mtt/ui/forms/node-id-field";
import { parseNodeId } from "@mtt/ui/forms/node-id";

const actionsClass =
  "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto";

export type GatewayFormValues = { node_id: number; label: string };

export type GatewayFormLabels = {
  label: string;
  node: NodeIdFieldLabels;
};

export function GatewayForm({
  labels,
  errors,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
  cancelLabel,
}: {
  labels: GatewayFormLabels;
  errors?: Record<string, string | undefined>;
  pending: boolean;
  submitLabel: string;
  onSubmit: (values: GatewayFormValues) => void;
  onCancel?: () => void;
  cancelLabel?: string;
}): ReactElement {
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
        <FormField id="device-label" label={labels.label} error={errors?.label}>
          <Input
            id="device-label"
            name="label"
            autoComplete="off"
            aria-invalid={errors?.label ? true : undefined}
            aria-describedby={errors?.label ? "device-label-error" : undefined}
          />
        </FormField>
        <NodeIdField id="device-node" name="node_id" error={errors?.node_id} labels={labels.node} />
      </FieldGroup>
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
    </form>
  );
}
