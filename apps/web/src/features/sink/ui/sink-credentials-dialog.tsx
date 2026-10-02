import type { SinkCredentials } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { CodeBlock } from "@/components/code-block";
import { Modal } from "@/components/modal";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { consumerCommand, sinkTitle } from "@/features/sink/model";

export type SinkCredentialsDialogProps = {
  /** The response that carries the password: from creating the sink or rotating its credentials. */
  credentials: SinkCredentials | null;
  /** Rotation also disconnected the consumers, so the copy says so. */
  rotated: boolean;
  onClose: () => void;
};

/** The one time the consumer's password is shown. Closing loses it; rotating issues a new one. */
export function SinkCredentialsDialog({ credentials, rotated, onClose }: SinkCredentialsDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const details = credentials
    ? [
        `broker:   ${credentials.broker}`,
        `username: ${credentials.username}`,
        `password: ${credentials.password}`,
        `topic:    ${credentials.topic_filter}`,
      ].join("\n")
    : "";

  return (
    <Modal
      open={credentials !== null}
      size="wide"
      title={
        credentials
          ? formatMessage(
              { id: "feature.sink.credentials.title", defaultMessage: "Credentials for {sink}" },
              { sink: sinkTitle(credentials) },
            )
          : ""
      }
      description={
        rotated
          ? formatMessage({
              id: "feature.sink.credentials.rotatedDescription",
              defaultMessage:
                "The old password no longer works and connected consumers were disconnected. Copy the new password now: it isn't shown again.",
            })
          : formatMessage({
              id: "feature.sink.credentials.description",
              defaultMessage:
                "Give these to the service that consumes the sink. Copy the password now: it isn't shown again.",
            })
      }
      onClose={onClose}
    >
      {credentials ? (
        <div className="flex min-w-0 flex-col gap-5">
          <CodeBlock
            code={details}
            label={formatMessage({ id: "feature.sink.credentials.detailsLabel", defaultMessage: "the credentials" })}
          />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-body-medium text-text-primary">
              {formatMessage({ id: "feature.sink.credentials.tryIt", defaultMessage: "Try it from a terminal" })}
            </p>
            <p className="text-caption-1-regular text-text-tertiary">
              {formatMessage({
                id: "feature.sink.credentials.tryItHint",
                defaultMessage:
                  "Prints every message the sink sends, over TLS. The client id and -c keep a session, so the broker queues messages while it's offline.",
              })}
            </p>
            <CodeBlock
              code={consumerCommand(credentials)}
              label={formatMessage({ id: "feature.sink.credentials.commandLabel", defaultMessage: "the mosquitto_sub command" })}
            />
          </div>
          <div className={dialogActionsClass}>
            <Button type="button" size="small" onClick={onClose}>
              {formatMessage({ id: "feature.sink.credentials.done", defaultMessage: "I've saved them" })}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
