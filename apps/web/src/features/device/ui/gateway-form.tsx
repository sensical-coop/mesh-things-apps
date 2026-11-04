import type { DeviceRead } from "@mtt/contracts";
import { DeviceCreate } from "@mtt/contracts";
import { GatewayForm as UiGatewayForm, type GatewayFormValues } from "@mtt/ui/forms/gateway-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { StatusCopy } from "@/components/status-copy";
import { deviceRepository } from "@/features/device/repository";
import { meshRepository } from "@/features/mesh/repository";
import { formLevelMessage, issueErrors, readApiError } from "@mtt/contracts/errors";

export function GatewayForm({
  meshId,
  onRegistered,
  submitLabel,
  onCancel,
}: {
  meshId: string;
  onRegistered?: (device: DeviceRead) => void | Promise<void>;
  /** Idle submit label. Pending state keeps "Registering gateway". */
  submitLabel?: string;
  onCancel?: () => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useMutation({
    ...deviceRepository.create(),
    onSuccess: async (device) => {
      await queryClient.invalidateQueries({ queryKey: deviceRepository.listKey() });
      await queryClient.invalidateQueries({ queryKey: meshRepository.devicesKey(meshId) });
      await onRegistered?.(device);
    },
    onError: (error) => setErrors(readApiError(error).fields),
  });

  function onSubmit(values: GatewayFormValues) {
    const parsed = DeviceCreate.safeParse({
      mesh_id: meshId,
      node_id: values.node_id,
      is_gateway: true,
      label: values.label === "" ? null : values.label,
    });
    if (!parsed.success) {
      setErrors(issueErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    create.mutate({ data: parsed.data });
  }

  return (
    <div className="flex flex-col gap-5">
      <UiGatewayForm
        labels={{
          label: formatMessage({ id: "page.meshes.detail.registerGatewayDialog.label", defaultMessage: "Label" }),
          node: {
            label: formatMessage({ id: "feature.device.nodeIdField.label", defaultMessage: "Node ID" }),
            hint: formatMessage({
              id: "feature.device.nodeIdField.hint",
              defaultMessage: "The node number as Meshtastic shows it: decimal (2130636288) or hex (!7efeee00).",
            }),
            decimal: formatMessage({ id: "feature.device.nodeIdField.decimal", defaultMessage: "Decimal" }),
            hex: formatMessage({ id: "feature.device.nodeIdField.hex", defaultMessage: "Hex (!)" }),
            invalidHex: formatMessage({
              id: "feature.device.nodeIdField.invalidHex",
              defaultMessage: "Enter up to 8 hex digits after the !.",
            }),
            invalidDecimal: formatMessage({
              id: "feature.device.nodeIdField.invalidDecimal",
              defaultMessage: "Enter a whole number from 0 to 4294967295.",
            }),
            asDecimal: (value) =>
              formatMessage({ id: "feature.device.nodeIdField.asDecimal", defaultMessage: "Decimal: {value}" }, { value }),
            asHex: (value) =>
              formatMessage({ id: "feature.device.nodeIdField.asHex", defaultMessage: "Hex: {value}" }, { value }),
          },
        }}
        errors={errors}
        pending={create.isPending}
        submitLabel={
          create.isPending
            ? formatMessage({
                id: "page.meshes.detail.registerGatewayDialog.registering",
                defaultMessage: "Registering gateway",
              })
            : (submitLabel ??
              formatMessage({
                id: "page.meshes.detail.registerGatewayDialog.title",
                defaultMessage: "Register gateway",
              }))
        }
        onCancel={onCancel}
        cancelLabel={formatMessage({ id: "page.meshes.detail.registerGatewayDialog.cancel", defaultMessage: "Cancel" })}
        onSubmit={onSubmit}
      />
      {create.error ? (
        <StatusCopy>
          {formatMessage({
            id: "page.meshes.detail.registerGatewayDialog.error",
            defaultMessage: "Registration failed. Check node ID and try again.",
          })}
          {formLevelMessage(create.error) ? ` ${formLevelMessage(create.error)}` : ""}
        </StatusCopy>
      ) : null}
    </div>
  );
}
