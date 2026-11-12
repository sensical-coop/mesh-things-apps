import type { DeviceRead, MeshRelay, RfLink } from "@mtt/contracts";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { cx } from "@mtt/ui/utils";
import { Link } from "@tanstack/react-router";
import { routes } from "@/router";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { StatusCopy } from "@/components/status-copy";
import {
  confirmedRelays,
} from "../model";


export function RelaysFrame({
  relays,
  links,
  nodeName,
  byNode,
}: {
  relays: MeshRelay[];
  links: RfLink[];
  nodeName: (node: number) => string;
  byNode: Map<number, DeviceRead>;
}): ReactElement {
  const { formatMessage, formatNumber } = useIntl();
  const title = formatMessage({ id: "page.meshes.detail.network.relays.title", defaultMessage: "Relays into gateways" });
  const nodeLink = (node: number, strong: boolean) => {
    const device = byNode.get(node);
    const text = nodeName(node);
    return device ? (
      <Link
        to={routes.device}
        params={{ deviceUuid: device.uuid }}
        className={cx("hover:text-accent-500", strong ? "text-text-primary" : "text-text-secondary")}
      >
        {text}
      </Link>
    ) : (
      text
    );
  };
  return (
    <Frame className="shadow-card">
      <FrameHeader>
        <FrameTitle>{title}</FrameTitle>
        <FrameDescription>
          {formatMessage({
            id: "page.meshes.detail.network.relays.description",
            defaultMessage:
              "The node that passed each relayed packet on to a gateway. Note: the node only reports the last byte of its number, so each comes with the potential registered nodes. If a gateway also hears a candidate directly, this makes it the likely one.",
          })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        {relays.length ? (
          <ul className="flex oa-arrive flex-col" aria-label={title}>
            {relays.map((relay) => {
              const candidates = relay.candidates.map((c) => c.node_id);
              const confirmed = confirmedRelays(candidates, relay.gateway_id, links);
              return (
                <li
                  key={`${relay.gateway_id}-${relay.relay}`}
                  className="flex flex-col gap-0.5 border-t border-separator-border py-2 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-baseline justify-between gap-3 text-body-2-regular">
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span className="min-w-0 truncate">{nodeLink(relay.gateway_id, true)}</span>
                      <span className="shrink-0 text-text-tertiary">←</span>
                      <span className="shrink-0 font-mono text-text-secondary">
                        ··{relay.relay.toString(16).padStart(2, "0")}
                      </span>
                    </span>
                    <span className="shrink-0 text-text-secondary tabular-nums">
                      {formatMessage(
                        { id: "page.meshes.detail.network.relays.count", defaultMessage: "{count} receptions" },
                        { count: formatNumber(relay.receptions) },
                      )}
                    </span>
                  </div>
                  <div className="text-caption-1-regular text-text-tertiary">
                    {candidates.length ? (
                      <span className="flex flex-wrap gap-x-2">
                        <span>
                          {formatMessage({ id: "page.meshes.detail.network.relays.candidates", defaultMessage: "Could be" })}
                        </span>
                        {candidates.map((node) => (
                          <span key={node}>
                            {nodeLink(node, confirmed.has(node))}
                            {confirmed.has(node)
                              ? ` ${formatMessage({
                                  id: "page.meshes.detail.network.relays.heardDirectly",
                                  defaultMessage: "(heard directly)",
                                })}`
                              : null}
                          </span>
                        ))}
                      </span>
                    ) : (
                      formatMessage({
                        id: "page.meshes.detail.network.relays.unregistered",
                        defaultMessage: "No registered node",
                      })
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <StatusCopy>
            {formatMessage({
              id: "page.meshes.detail.network.relays.none",
              defaultMessage: "No relayed packets reached a gateway in this range.",
            })}
          </StatusCopy>
        )}
      </FramePanel>
    </Frame>
  );
}
