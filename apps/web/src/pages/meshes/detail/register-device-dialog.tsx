import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { GatewayForm } from "@/features/device/ui/gateway-form";

export function RegisterDeviceDialog({
  meshId,
  open,
  onClose,
}: {
  meshId: string;
  open: boolean;
  onClose: () => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <Modal
      open={open}
      title={formatMessage({ id: "page.meshes.detail.registerGatewayDialog.title", defaultMessage: "Register gateway" })}
      description={formatMessage({
        id: "page.meshes.detail.registerGatewayDialog.description",
        defaultMessage: "A registered gateway authorizes its traffic to be decoded.",
      })}
      onClose={onClose}
    >
      {open ? <GatewayForm meshId={meshId} onCancel={onClose} onRegistered={async () => onClose()} /> : null}
    </Modal>
  );
}
