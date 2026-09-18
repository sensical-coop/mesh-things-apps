import { Chip } from "@mtt/ui/components/base/badges/chip";
import { cx } from "@mtt/ui/utils";
import { type ReactElement } from "react";

const packets = [
  { node: "gw-barcelona", kind: "nodeinfo", age: "2s", gateway: true },
  { node: "valencia-12", kind: "telemetry", age: "9s", gateway: false },
  { node: "madrid-gw", kind: "position", age: "16s", gateway: true },
  { node: "zaragoza-4", kind: "telemetry", age: "23s", gateway: false },
  { node: "palma-9", kind: "nodeinfo", age: "30s", gateway: false },
  { node: "lisbon-2", kind: "telemetry", age: "37s", gateway: false },
] as const;

export function LandingPacketFeed(): ReactElement {
  return (
    <ul className="flex flex-col py-1" aria-hidden>
      {packets.map((packet, index) => (
        <li key={packet.node} className="flex h-8 items-center justify-between gap-3 px-3">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className={cx(
                "size-1.5 shrink-0 rounded-full",
                packet.gateway ? "bg-accent-500" : "bg-text-tertiary",
              )}
            />
            <span className="truncate text-body-medium text-text-primary">{packet.node}</span>
            <Chip variant="caption" color="soft" className="hidden rounded-full sm:inline-flex">
              {packet.kind}
            </Chip>
          </span>
          <span
            className={cx(
              "shrink-0 font-mono text-caption-1-regular tabular-nums text-text-tertiary",
              index === 0 && "text-accent-500",
            )}
          >
            {packet.age}
          </span>
        </li>
      ))}
    </ul>
  );
}
