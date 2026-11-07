import type { DeviceRead } from "@mtt/contracts";
import { DeviceCreate } from "@mtt/contracts";
import { GatewayForm as UiGatewayForm, type GatewayFormValues } from "@mtt/ui/forms/gateway-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { deviceRepository } from "@/features/device/repository";
import { meshRepository } from "@/features/mesh/repository";
import { formLevelMessage, issueErrors, readApiError } from "@mtt/contracts/errors";

export function GatewayForm({
  meshId,
  onRegistered,
  onCancel,
}: {
  meshId: string;
  onRegistered?: (device: DeviceRead) => void | Promise<void>;
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
        errors={errors}
        pending={create.isPending}
        failed={create.error != null}
        alertDetail={formLevelMessage(create.error)}
        onCancel={onCancel}
        cancelLabel={formatMessage({ id: "page.meshes.detail.registerGatewayDialog.cancel", defaultMessage: "Cancel" })}
        onSubmit={onSubmit}
      />
    </div>
  );
}
