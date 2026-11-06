import type { DeviceRead, GatewayBroker, Mesh } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { useQuery } from "@tanstack/react-query";
import { cx } from "@mtt/ui/utils";
import { type ReactElement, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { formatNodeId } from "@mtt/ui/forms/node-id";
import { authRepository } from "@/features/auth/repository";
import { meshRepository } from "@/features/mesh/repository";
import { ConnectFigure } from "@/figures/connect/figure";
import { StepHeading } from "./step-heading";
import { StepLayout } from "./step-layout";

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
  const broker = useQuery(authRepository.broker());
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
                {node.label?.trim() || formatNodeId(node.node_id, "hex")}
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
        <Button type="button" size="medium" onClick={onContinue}>
          {formatMessage({ id: "page.start.connect.continue", defaultMessage: "Continue to next steps" })}
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="medium" variant="secondary" disabled={devices.isFetching} onClick={() => void devices.refetch()}>
            {formatMessage({ id: "page.start.connect.checkNow", defaultMessage: "Check now" })}
          </Button>
          <Button type="button" size="medium" variant="ghost" onClick={onSkip}>
            {formatMessage({ id: "page.start.connect.later", defaultMessage: "I'll do this later" })}
          </Button>
        </div>
      )}
    </StepLayout>
  );
}

function BrokerDetails({
  broker,
}: {
  broker: {
    data: GatewayBroker | null | undefined;
    isPending: boolean;
    isError: boolean;
    refetch: () => Promise<unknown>;
  };
}): ReactElement {
  const { formatMessage } = useIntl();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState("");

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied("");
    window.setTimeout(() => setCopied(formatMessage({ id: "page.start.connect.copied", defaultMessage: "Copied" })), 30);
  }

  if (broker.isPending) {
    return (
      <p role="status">
        {formatMessage({ id: "page.start.connect.loading", defaultMessage: "Loading the broker details." })}
      </p>
    );
  }
  if (broker.isError || broker.data === undefined) {
    return (
      <div className="flex flex-col items-start gap-2" role="alert">
        <p>{formatMessage({ id: "page.start.connect.error", defaultMessage: "The broker details didn't load. Try again.", })}</p>
        <Button type="button" size="small" variant="secondary" onClick={() => void broker.refetch()}>
          {formatMessage({ id: "page.start.connect.retry", defaultMessage: "Load again" })}
        </Button>
      </div>
    );
  }
  if (broker.data === null) {
    return (
      <p>
        {formatMessage({
          id: "page.start.connect.admin",
          defaultMessage: "Ask your Mesh Things administrator for the broker host, port, and gateway login.",
        })}
      </p>
    );
  }

  const tls = formatMessage(
    broker.data.tls
      ? { id: "page.start.connect.tlsOn", defaultMessage: "On" }
      : { id: "page.start.connect.tlsOff", defaultMessage: "Off" },
  );
  const rows = [
    { label: formatMessage({ id: "page.start.connect.host", defaultMessage: "Host" }), value: broker.data.host, copy: formatMessage({ id: "page.start.connect.copyHost", defaultMessage: "Copy host" }) },
    { label: formatMessage({ id: "page.start.connect.port", defaultMessage: "Port" }), value: String(broker.data.port), copy: formatMessage({ id: "page.start.connect.copyPort", defaultMessage: "Copy port" }) },
    { label: formatMessage({ id: "page.start.connect.tls", defaultMessage: "TLS" }), value: tls, copy: formatMessage({ id: "page.start.connect.copyTls", defaultMessage: "Copy TLS" }) },
    { label: formatMessage({ id: "page.start.connect.username", defaultMessage: "Username" }), value: broker.data.username, copy: formatMessage({ id: "page.start.connect.copyUsername", defaultMessage: "Copy username" }) },
  ];

  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap items-center gap-2">
            <dt className="text-text-primary">{row.label}</dt>
            <dd className="font-mono text-text-primary">{row.value}</dd>
            <Button type="button" size="xs" variant="secondary" onClick={() => void copy(row.value)}>
              {row.copy}
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <dt className="text-text-primary">{formatMessage({ id: "page.start.connect.password", defaultMessage: "Password" })}</dt>
          <dd className="font-mono text-text-primary">{revealed ? broker.data.password : "••••••••"}</dd>
          <Button
            type="button"
            size="xs"
            variant="secondary"
            aria-pressed={revealed}
            onClick={() => setRevealed((current) => !current)}
          >
            {formatMessage(
              revealed
                ? { id: "page.start.connect.hidePassword", defaultMessage: "Hide password" }
                : { id: "page.start.connect.showPassword", defaultMessage: "Show password" },
            )}
          </Button>
          <Button type="button" size="xs" variant="secondary" onClick={() => void copy(broker.data?.password ?? "")}>
            {formatMessage({ id: "page.start.connect.copyPassword", defaultMessage: "Copy password" })}
          </Button>
        </div>
      </dl>
      <p className="text-text-primary" role="status" aria-live="polite">
        {copied}
      </p>
    </div>
  );
}
