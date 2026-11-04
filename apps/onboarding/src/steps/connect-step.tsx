import type { DeviceRead, Mesh } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { formatNodeId } from "@mtt/ui/forms/node-id";
import { meshRepository } from "@/features/mesh/repository";
import { StepHeading } from "./step-heading";

const CHECKLIST_AFTER_MS = 10 * 60 * 1000;

export function ConnectStep({
  mesh,
  gateway,
  onContinue,
  onSkip,
}: {
  mesh: Mesh;
  gateway: DeviceRead;
  onContinue: () => void;
  onSkip: () => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const devices = useQuery({
    ...meshRepository.devices(mesh.id),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
  const live = (devices.data ?? []).find((device) => device.uuid === gateway.uuid) ?? gateway;
  const seen = live.last_seen !== null;
  const nodes = (devices.data ?? []).filter((device) => !device.is_gateway);
  const showChecklist = !seen && now - startedAt >= CHECKLIST_AFTER_MS;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const waiting = formatMessage({
    id: "page.start.connect.waiting",
    defaultMessage: "Waiting for the gateway. This starts once the radio publishes.",
  });
  const connected = formatMessage({
    id: "page.start.connect.connected",
    defaultMessage: "Gateway connected. A packet has arrived.",
  });

  return (
    <div className="flex flex-col gap-5">
      <StepHeading>
        {formatMessage({ id: "page.start.connect.title", defaultMessage: "Connect the gateway" })}
      </StepHeading>
      <div className="flex flex-col gap-2 text-body-medium text-text-secondary">
        <p>
          {formatMessage({
            id: "page.start.connect.admin",
            defaultMessage: "Ask your Mesh Things administrator for the broker host, port, and gateway login.",
          })}
        </p>
        <p>
          {formatMessage(
            {
              id: "page.start.connect.uplink",
              defaultMessage:
                "In the Meshtastic app, enable MQTT and uplink on the {channel} channel, and leave encryption on. Leave the root topic at its default.",
            },
            { channel: mesh.channel_id },
          )}
        </p>
      </div>
      <p className="text-body-medium text-text-primary" role="status" aria-live="polite">
        {seen ? connected : waiting}
      </p>
      {devices.isError ? (
        <p className="text-body-medium text-text-secondary" role="alert">
          {formatMessage({
            id: "page.start.connect.pollError",
            defaultMessage: "The last check didn't reach the server. We'll keep trying.",
          })}
        </p>
      ) : null}
      {nodes.length > 0 ? (
        <ul className="flex flex-col gap-1 text-body-medium text-text-secondary">
          {nodes.map((node) => (
            <li key={node.uuid}>
              {node.label?.trim() || formatNodeId(node.node_id, "hex")}
            </li>
          ))}
        </ul>
      ) : null}
      {showChecklist ? (
        <ul className="list-disc space-y-1 ps-5 text-body-medium text-text-secondary">
          <li>{formatMessage({ id: "page.start.connect.check.network", defaultMessage: "The gateway has a network connection." })}</li>
          <li>
            {formatMessage(
              { id: "page.start.connect.check.channel", defaultMessage: "The channel name matches {channel}, including capitals." },
              { channel: mesh.channel_id },
            )}
          </li>
          <li>{formatMessage({ id: "page.start.connect.check.uplink", defaultMessage: "Uplink is on for that channel." })}</li>
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {seen ? (
          <Button type="button" size="medium" onClick={onContinue}>
            {formatMessage({ id: "page.start.connect.continue", defaultMessage: "Continue to next steps" })}
          </Button>
        ) : (
          <Button type="button" size="medium" variant="secondary" disabled={devices.isFetching} onClick={() => void devices.refetch()}>
            {formatMessage({ id: "page.start.connect.checkNow", defaultMessage: "Check now" })}
          </Button>
        )}
        <Button type="button" size="medium" variant="secondary" onClick={onSkip}>
          {formatMessage({ id: "page.start.connect.later", defaultMessage: "I'll do this later" })}
        </Button>
      </div>
    </div>
  );
}
