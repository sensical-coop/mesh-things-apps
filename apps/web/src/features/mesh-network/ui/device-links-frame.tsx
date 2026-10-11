import type { DeviceRead, RfLink } from "@mtt/contracts";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { useFormatters } from "@/hooks/use-formatters";
import { deviceTitle } from "@/features/device/model";
import { meshRepository } from "@/features/mesh/repository";
import { routes } from "@/router";
import { nodeHex } from "../model";

/** Nodes this device hears and nodes that hear it, over the last week. */
export function DeviceLinksFrame({ device }: { device: DeviceRead }): ReactElement {
  const { formatMessage, formatNumber } = useIntl();
  const { formatLastSeen } = useFormatters();
  const links = useQuery(
    meshRepository.links({ path: { mesh_id: device.mesh_id }, query: { since: "7d", node_id: String(device.node_id) } }),
  );
  const meshDevices = useQuery(meshRepository.devices({ path: { mesh_id: device.mesh_id } }));
  const byNode = useMemo(() => new Map((meshDevices.data ?? []).map((d) => [d.node_id, d])), [meshDevices.data]);

  const sourceLabel: Record<RfLink["source"], string> = {
    traceroute: formatMessage({ id: "page.devices.detail.links.source.traceroute", defaultMessage: "Traceroute" }),
    neighborinfo: formatMessage({ id: "page.devices.detail.links.source.neighborinfo", defaultMessage: "Neighbor report" }),
    direct: formatMessage({ id: "page.devices.detail.links.source.direct", defaultMessage: "Direct reception" }),
  };

  const other = (link: RfLink) => {
    const node = link.from_node === device.node_id ? link.to_node : link.from_node;
    const known = byNode.get(node);
    return known ? (
      <Link to={routes.device} params={{ deviceUuid: known.uuid }} className="hover:text-accent-500">
        {deviceTitle(known)}
      </Link>
    ) : (
      nodeHex(node)
    );
  };

  return (
    <Frame className="shadow-card">
      <FrameHeader>
        <FrameTitle>{formatMessage({ id: "page.devices.detail.links.title", defaultMessage: "Radio links" })}</FrameTitle>
        <FrameDescription>
          {formatMessage({
            id: "page.devices.detail.links.description",
            defaultMessage: "Nodes this device heard, and nodes that heard it, over the last 7 days.",
          })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        {links.isPending ? <SkeletonRows rows={2} /> : null}
        {links.data?.length === 0 ? (
          <StatusCopy>
            {formatMessage({
              id: "page.devices.detail.links.none",
              defaultMessage: "No radio links heard for this device in the last 7 days.",
            })}
          </StatusCopy>
        ) : null}
        {links.data?.length ? (
          <ul className="oa-arrive flex flex-col">
            {links.data.map((link) => (
              <li
                key={`${link.from_node}-${link.to_node}-${link.source}`}
                className="flex flex-col gap-0.5 border-t border-separator-border py-2 first:border-t-0 first:pt-0"
              >
                <span className="flex items-baseline justify-between gap-3 text-body-2-regular">
                  <span className="min-w-0 truncate text-text-primary">{other(link)}</span>
                  <span className="shrink-0 tabular-nums text-text-primary">
                    {formatMessage(
                      { id: "page.devices.detail.links.snrValue", defaultMessage: "{snr} dB" },
                      { snr: formatNumber(link.snr_mean, { maximumFractionDigits: 1 }) },
                    )}
                  </span>
                </span>
                <span className="text-caption-1-regular text-text-tertiary">
                  {[
                    link.to_node === device.node_id
                      ? formatMessage({ id: "page.devices.detail.links.hears", defaultMessage: "Heard by this device" })
                      : formatMessage({ id: "page.devices.detail.links.heardBy", defaultMessage: "Heard this device" }),
                    sourceLabel[link.source],
                    formatLastSeen(link.last_seen),
                  ].join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </FramePanel>
    </Frame>
  );
}
