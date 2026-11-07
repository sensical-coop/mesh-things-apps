import type { Traceroute } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { TracerouteList } from "./traceroute-list";


export function TraceroutePanel({
  traceroutes,
  limit,
  onMore,
  selected,
  onSelect,
  route,
  nodeName,
  snr,
}: {
  traceroutes: { data: Traceroute[] | undefined; isPending: boolean };
  limit: number;
  onMore: () => void;
  selected: number | null;
  onSelect: (id: number) => void;
  route: { shown: number; total: number } | null;
  nodeName: (node: number) => string;
  snr: (value: number) => string;
}): ReactElement {
  const { formatMessage } = useIntl();
  if (traceroutes.isPending) return <SkeletonRows rows={3} />;
  if (!traceroutes.data?.length) {
    return (
      <StatusCopy>
        {formatMessage({
          id: "page.meshes.detail.network.traceroutes.none",
          defaultMessage: "No traceroutes heard on this mesh in the last 30 days.",
        })}
      </StatusCopy>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {route && route.shown < route.total ? (
        <p className="text-caption-1-regular text-pretty text-text-tertiary">
          {formatMessage(
            {
              id: "page.meshes.detail.network.traceroutes.partialRoute",
              defaultMessage: "Drawn through the {shown} of {total} nodes on this route that have a position.",
            },
            route,
          )}
        </p>
      ) : null}
      <TracerouteList
        traceroutes={traceroutes.data}
        selected={selected}
        onSelect={onSelect}
        nodeName={nodeName}
        snr={snr}
      />
      {traceroutes.data.length >= limit ? (
        <Button type="button" size="small" variant="secondary" className="self-start" onClick={onMore}>
          {formatMessage({ id: "page.meshes.detail.network.traceroutes.more", defaultMessage: "Show older" })}
        </Button>
      ) : null}
    </div>
  );
}
