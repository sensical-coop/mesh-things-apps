import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { CodeBlock } from "@/components/code-block";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { authRepository } from "@/features/auth/repository";

/** Issues a new API key and shows it once. The previous key stops working straight away. */
export function RotateApiKeyDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const { formatMessage } = useIntl();
  const rotate = useMutation({ ...authRepository.rotateKey() });
  const apiKey = rotate.data?.api_key;

  function close() {
    rotate.reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      size={apiKey ? "wide" : "default"}
      title={
        apiKey
          ? formatMessage({ id: "feature.auth.rotateKey.shownTitle", defaultMessage: "Your new API key" })
          : formatMessage({ id: "feature.auth.rotateKey.title", defaultMessage: "Generate a new API key" })
      }
      description={
        apiKey
          ? formatMessage({
              id: "feature.auth.rotateKey.shownDescription",
              defaultMessage: "Copy it now and keep it somewhere safe: it isn't shown again.",
            })
          : formatMessage({
              id: "feature.auth.rotateKey.description",
              defaultMessage:
                "Any service using your current key will stop working until you update it with the new key.",
            })
      }
      onClose={close}
    >
      {apiKey ? (
        <div className="flex min-w-0 flex-col gap-5">
          <CodeBlock
            code={apiKey}
            label={formatMessage({ id: "feature.auth.rotateKey.keyLabel", defaultMessage: "the API key" })}
          />
          <div className={dialogActionsClass}>
            <Button type="button" size="small" onClick={close}>
              {formatMessage({ id: "feature.auth.rotateKey.done", defaultMessage: "I've saved it" })}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {rotate.error ? (
            <StatusCopy>
              {formatMessage({
                id: "feature.auth.rotateKey.error",
                defaultMessage: "No new key was generated. The current one still works. Try again.",
              })}
            </StatusCopy>
          ) : null}
          <div className={dialogActionsClass}>
            <Button type="button" variant="secondary" size="small" onClick={close}>
              {formatMessage({ id: "feature.auth.rotateKey.cancel", defaultMessage: "Cancel" })}
            </Button>
            <Button type="button" size="small" disabled={rotate.isPending} onClick={() => rotate.mutate({})}>
              {rotate.isPending
                ? formatMessage({ id: "feature.auth.rotateKey.generating", defaultMessage: "Generating" })
                : formatMessage({ id: "feature.auth.rotateKey.confirm", defaultMessage: "Generate new key" })}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
