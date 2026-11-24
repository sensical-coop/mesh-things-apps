import { useRegisterGateway } from "@mtt/contracts/register-gateway";
import { GatewayForm as UiGatewayForm } from "@mtt/ui/forms/gateway-form";
import { type ReactElement } from "react";

export function GatewayForm({
  meshId,
  onRegistered,
  onCancel,
}: {
  meshId: string;
  onRegistered?: () => void | Promise<void>;
  onCancel?: () => void;
}): ReactElement {
  const { submit, ...state } = useRegisterGateway(meshId, onRegistered);
  return <UiGatewayForm {...state} onCancel={onCancel} onSubmit={submit} />;
}
