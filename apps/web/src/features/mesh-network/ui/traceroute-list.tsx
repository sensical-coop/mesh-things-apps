import type { Traceroute } from "@mtt/contracts";
import { cx } from "@mtt/ui/utils";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { useFormatters } from "@/hooks/use-formatters";


export function TracerouteList({
  traceroutes,
  selected,
  onSelect,
  nodeName,
  snr,
}: {
  traceroutes: Traceroute[];
  selected: number | null;
  onSelect: (id: number) => void;
  nodeName: (node: number) => string;
  snr: (value: number) => string;
}): ReactElement {
  const { formatMessage, formatNumber } = useIntl();
  const { formatWhen } = useFormatters();
  return (
    <ul className="flex oa-arrive flex-col gap-1">
      {traceroutes.map((t) => {
        const hops = Math.max(0, t.towards.length - 2);
        const measured = t.snr_towards.filter((v): v is number => v != null);
        return (
          <li key={t.id}>
            <button
              type="button"
              aria-pressed={selected === t.id}
              onClick={() => onSelect(t.id)}
              className={cx(
                "flex w-full flex-col gap-0.5 rounded-lg border-s-2 border-transparent px-3 py-2 text-left outline-hidden",
                "hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                // Cyan, like the selected route on the map.
                selected === t.id && "border-route-selected bg-background-secondary-default",
              )}
            >
              <span className="flex items-baseline justify-between gap-3 text-body-2-regular">
                <span className="min-w-0 truncate text-text-primary">
                  {nodeName(t.origin)} → {nodeName(t.target)}
                </span>
                <span className="shrink-0 text-text-secondary tabular-nums">{formatWhen(t.heard_at)}</span>
              </span>
              <span className="text-caption-1-regular text-text-tertiary">
                {[
                  t.complete
                    ? formatMessage(
                        {
                          id: "page.meshes.detail.network.traceroutes.hops",
                          defaultMessage: "{count, plural, =0 {Direct} one {# hop} other {# hops}}",
                        },
                        { count: hops },
                      )
                    : formatMessage({
                        id: "page.meshes.detail.network.traceroutes.partial",
                        defaultMessage: "Heard on its way out",
                      }),
                  measured.length
                    ? formatMessage(
                        { id: "page.meshes.detail.network.traceroutes.snrs", defaultMessage: "SNR {values} dB" },
                        { values: measured.map(snr).join(" · ") },
                      )
                    : null,
                  t.distance_km != null
                    ? formatMessage(
                        { id: "page.meshes.detail.network.traceroutes.distance", defaultMessage: "{km} km" },
                        { km: formatNumber(t.distance_km, { maximumFractionDigits: 1 }) },
                      )
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
