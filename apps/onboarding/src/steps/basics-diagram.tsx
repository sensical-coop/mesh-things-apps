import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { cx } from "@mtt/ui/utils";

export type BasicsConcept = "mesh" | "gateway" | "node" | "reading";

const PARTS: Record<BasicsConcept, string> = {
  node: "nodes",
  gateway: "gateway",
  mesh: "mqtt",
  reading: "readings",
};

export function BasicsDiagram({ selected }: { selected: BasicsConcept }): ReactElement {
  const { formatMessage } = useIntl();
  const labels = {
    nodes: formatMessage({ id: "page.start.basics.diagram.nodes", defaultMessage: "Nodes" }),
    gateway: formatMessage({ id: "page.start.basics.diagram.gateway", defaultMessage: "Gateway" }),
    mqtt: formatMessage({ id: "page.start.basics.diagram.mqtt", defaultMessage: "MQTT" }),
    app: formatMessage({ id: "page.start.basics.diagram.app", defaultMessage: "Mesh Things" }),
    readings: formatMessage({ id: "page.start.basics.diagram.readings", defaultMessage: "Readings" }),
  };

  function tone(part: string): string {
    const active = PARTS[selected] === part || (selected === "mesh" && part === "app");
    return cx(
      "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
      active ? "opacity-100" : "opacity-40",
    );
  }

  return (
    <svg viewBox="0 0 520 88" role="img" aria-label={labels.app} className="w-full text-text-primary">
      <g className={tone("nodes")}>
        <rect x="8" y="28" width="72" height="32" rx="16" className="fill-background-primary-default stroke-separator-border" />
        <text x="44" y="48" textAnchor="middle" className="fill-current text-[11px]">{labels.nodes}</text>
      </g>
      <g className={tone("gateway")}>
        <rect x="116" y="28" width="88" height="32" rx="16" className="fill-background-primary-default stroke-separator-border" />
        <text x="160" y="48" textAnchor="middle" className="fill-current text-[11px]">{labels.gateway}</text>
      </g>
      <g className={tone("mqtt")}>
        <rect x="240" y="28" width="72" height="32" rx="16" className="fill-background-primary-default stroke-separator-border" />
        <text x="276" y="48" textAnchor="middle" className="fill-current text-[11px]">{labels.mqtt}</text>
      </g>
      <g className={tone("app")}>
        <rect x="348" y="28" width="72" height="32" rx="16" className="fill-background-primary-default stroke-separator-border" />
        <text x="384" y="48" textAnchor="middle" className="fill-current text-[11px]">{labels.app}</text>
      </g>
      <g className={tone("readings")}>
        <rect x="436" y="28" width="76" height="32" rx="16" className="fill-background-primary-default stroke-separator-border" />
        <text x="474" y="48" textAnchor="middle" className="fill-current text-[11px]">{labels.readings}</text>
      </g>
      <path d="M80 44 H116 M204 44 H240 M312 44 H348 M420 44 H436" className="stroke-separator-border" />
    </svg>
  );
}
