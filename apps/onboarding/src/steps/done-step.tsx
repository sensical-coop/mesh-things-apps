import type { DeviceRead, Mesh } from "@mtt/contracts";
import { ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { formatNodeId } from "@mtt/ui/forms/node-id";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { StepHeading } from "./step-heading";

export function DoneStep({
  mesh,
  gateway,
  nodeCount,
  absenceOn,
  seen,
}: {
  mesh: Mesh;
  gateway: DeviceRead;
  nodeCount: number;
  absenceOn: boolean;
  seen: boolean;
}): ReactElement {
  const { formatMessage } = useIntl();
  const meshName = mesh.label?.trim() || mesh.channel_id;
  const gatewayName = gateway.label?.trim() || formatNodeId(gateway.node_id, "hex");
  return (
    <div className="flex flex-col gap-5">
      <StepHeading>
        {formatMessage({ id: "page.start.done.title", defaultMessage: "Your mesh is set up" })}
      </StepHeading>
      <ul className="flex flex-col gap-1 text-body-medium text-text-secondary">
        <li>{formatMessage({ id: "page.start.done.mesh", defaultMessage: "{name}, channel {channel}" }, { name: meshName, channel: mesh.channel_id })}</li>
        <li>
          {formatMessage(
            { id: "page.start.done.gateway", defaultMessage: "{name}, node {node}" },
            { name: gatewayName, node: formatNodeId(gateway.node_id, "hex") },
          )}
        </li>
        <li>
          {seen
            ? formatMessage({ id: "page.start.done.seen", defaultMessage: "The gateway has been seen." })
            : formatMessage({ id: "page.start.done.unseen", defaultMessage: "The gateway has not been seen yet." })}
        </li>
        <li>
          {formatMessage(
            { id: "page.start.done.nodes", defaultMessage: "{count, plural, one {# other node has appeared.} other {# other nodes have appeared.}}" },
            { count: nodeCount },
          )}
        </li>
        <li>
          {absenceOn
            ? formatMessage({ id: "page.start.done.alarmOn", defaultMessage: "The absence alarm is on." })
            : formatMessage({ id: "page.start.done.alarmOff", defaultMessage: "The absence alarm is off." })}
        </li>
      </ul>
      <ButtonLink href={`/console/meshes/${mesh.id}`}>
        {formatMessage({ id: "page.start.done.open", defaultMessage: "Open {name} in the console" }, { name: meshName })}
      </ButtonLink>
      <a className="text-body-small text-text-secondary underline" href="/docs/start">
        {formatMessage({ id: "page.start.done.docs", defaultMessage: "Read how setup works" })}
      </a>
    </div>
  );
}
