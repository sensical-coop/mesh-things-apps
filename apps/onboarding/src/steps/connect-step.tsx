import type { DeviceRead, Mesh } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { useQuery } from "@tanstack/react-query";
import { cx } from "@mtt/ui/utils";
import { type ReactElement, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { authRepository } from "@/features/auth/repository";
import { gatewayTitle, isSeen, nodesOf } from "@/features/device/model";
import { meshRepository } from "@/features/mesh/repository";
import { ConnectFigure } from "@/figures/connect/figure";
import { POLL_MS } from "@/timing";
import { BrokerDetails } from "./broker-details";
import { StepHeading } from "./step-heading";
import { StepLayout } from "./step-layout";

const CHECKLIST_AFTER_MS = 10 * 60 * 1000;

export function ConnectStep({
  mesh,
  gateway,
  onNext,
}: {
  mesh: Mesh;
  gateway: DeviceRead;
  onNext: () => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const devices = useQuery({
    ...meshRepository.devices(mesh.id),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
  const broker = useQuery(authRepository.broker());
  const seen = isSeen(gateway);
  const nodes = nodesOf(devices.data ?? []);
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
    <StepLayout figure={<ConnectFigure />}>
      <StepHeading>
        {formatMessage({ id: "page.start.connect.title", defaultMessage: "Connect the gateway" })}
      </StepHeading>
      <div className="flex flex-col gap-2 text-body-medium text-text-secondary">
        <BrokerDetails broker={broker} />
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
      <p
        className="flex items-center gap-3 oa-squircle-inset bg-background-secondary-default px-4 py-3 text-body-medium text-text-primary"
        role="status"
        aria-live="polite"
      >
        <span className="relative flex size-2 shrink-0" aria-hidden>
          {seen ? null : <span className="absolute inset-0 animate-ping rounded-full bg-text-tertiary opacity-60 motion-reduce:hidden" />}
          <span className={cx("relative size-2 rounded-full", seen ? "bg-state-success-text" : "bg-text-tertiary")} />
        </span>
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
        <div className="flex flex-col gap-2">
          <p className="text-body-2-regular text-text-secondary">
            {formatMessage({ id: "page.start.connect.nodes", defaultMessage: "Nodes heard through the gateway" })}
          </p>
          <ul className="flex flex-wrap gap-2">
            {nodes.map((node) => (
              <li key={node.uuid} className="rounded-full border border-separator-border px-2.5 py-0.5 font-mono text-caption-1-regular text-text-primary">
                {gatewayTitle(node)}
              </li>
            ))}
          </ul>
        </div>
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
      {seen ? (
        <Button type="button" size="medium" onClick={onNext}>
          {formatMessage({ id: "page.start.connect.continue", defaultMessage: "Continue to next steps" })}
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="medium" variant="secondary" disabled={devices.isFetching} onClick={() => void devices.refetch()}>
            {formatMessage({ id: "page.start.connect.checkNow", defaultMessage: "Check now" })}
          </Button>
          <Button type="button" size="medium" variant="ghost" onClick={onNext}>
            {formatMessage({ id: "page.start.connect.later", defaultMessage: "I'll do this later" })}
          </Button>
        </div>
      )}
    </StepLayout>
  );
}
