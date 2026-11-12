import type { GatewayBroker } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";

export function BrokerDetails({
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
  // `count` keys the live region, so copying twice in a row is announced twice.
  const [copied, setCopied] = useState<{ count: number; ok: boolean } | null>(null);

  async function copy(value: string) {
    let ok = true;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      ok = false;
    }
    setCopied((current) => ({ count: (current?.count ?? 0) + 1, ok }));
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
      <p key={copied?.count} className="text-text-primary" role="status" aria-live="polite">
        {copied
          ? copied.ok
            ? formatMessage({ id: "page.start.connect.copied", defaultMessage: "Copied" })
            : formatMessage({ id: "page.start.connect.copyFailed", defaultMessage: "Couldn't copy. Select the text and copy it by hand." })
          : null}
      </p>
    </div>
  );
}
