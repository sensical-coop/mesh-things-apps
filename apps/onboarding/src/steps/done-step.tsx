import type { DeviceRead, Mesh } from "@mtt/contracts";
import { ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { formatNodeId } from "@mtt/ui/forms/node-id";
import { cx } from "@mtt/ui/utils";
import type { ReactElement, ReactNode } from "react";
import { useIntl } from "react-intl";
import { DoneFigure } from "@/figures/done/figure";
import { StepHeading } from "./step-heading";
import { StepLayout } from "./step-layout";

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
  const nodeId = formatNodeId(gateway.node_id, "hex");
  const gatewayName = gateway.label?.trim() || nodeId;
  const rows: { label: string; value: ReactNode; detail?: string }[] = [
    {
      label: formatMessage({ id: "page.start.done.meshLabel", defaultMessage: "Mesh" }),
      value: meshName,
      detail: meshName === mesh.channel_id ? undefined : mesh.channel_id,
    },
    {
      label: formatMessage({ id: "page.start.done.gatewayLabel", defaultMessage: "Gateway" }),
      value: (
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className={cx("size-2 rounded-full", seen ? "bg-state-success-text" : "bg-separator-border")} />
          {seen
            ? formatMessage({ id: "page.start.done.seen", defaultMessage: "Seen" })
            : formatMessage({ id: "page.start.done.unseen", defaultMessage: "Not seen yet" })}
        </span>
      ),
      detail: gatewayName === nodeId ? nodeId : `${gatewayName} · ${nodeId}`,
    },
    {
      label: formatMessage({ id: "page.start.done.nodesLabel", defaultMessage: "Other nodes" }),
      value: <span className="tabular-nums">{nodeCount}</span>,
    },
    {
      label: formatMessage({ id: "page.start.done.alarmLabel", defaultMessage: "Absence alarm" }),
      value: absenceOn
        ? formatMessage({ id: "page.start.done.alarmOn", defaultMessage: "On" })
        : formatMessage({ id: "page.start.done.alarmOff", defaultMessage: "Off" }),
    },
  ];
  return (
    <StepLayout figure={<DoneFigure />}>
      <StepHeading>
        {formatMessage({ id: "page.start.done.title", defaultMessage: "Your mesh is set up" })}
      </StepHeading>
      <dl className="flex flex-col divide-y divide-separator-border oa-squircle-inset bg-background-secondary-default px-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-body-2-regular text-text-secondary">{row.label}</dt>
            <dd className="flex min-w-0 flex-col items-end text-end text-body-medium text-text-primary">
              {row.value}
              {row.detail ? <span className="truncate font-mono text-caption-1-regular text-text-tertiary">{row.detail}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
      <ButtonLink href={`/console/meshes/${mesh.id}`}>
        {formatMessage({ id: "page.start.done.open", defaultMessage: "Open {name} in the console" }, { name: meshName })}
      </ButtonLink>
      <a className="self-center text-body-2-regular text-text-secondary underline underline-offset-2" href="/docs/start">
        {formatMessage({ id: "page.start.done.docs", defaultMessage: "Read how setup works" })}
      </a>
    </StepLayout>
  );
}
