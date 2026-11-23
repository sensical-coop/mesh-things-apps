import { SITE_PATHS } from "@mtt/contracts/site";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { cx } from "@mtt/ui/utils";
import { BasicsFigure } from "@/figures/basics/figure";
import type { BasicsConcept } from "@/figures/basics/model";
import { StepHeading } from "./step-heading";

export function BasicsStep({ onContinue }: { onContinue: () => void }): ReactElement {
  const { formatMessage } = useIntl();
  const [selected, setSelected] = useState<BasicsConcept>("mesh");
  const copy: Record<BasicsConcept, { title: string; body: string }> = {
    node: {
      title: formatMessage({ id: "page.start.basics.node.title", defaultMessage: "Node" }),
      body: formatMessage({
        id: "page.start.basics.node.body",
        defaultMessage: "A node is any other radio on the mesh. Nodes show up here once the gateway has forwarded a packet from them.",
      }),
    },
    gateway: {
      title: formatMessage({ id: "page.start.basics.gateway.title", defaultMessage: "Gateway" }),
      body: formatMessage({
        id: "page.start.basics.gateway.body",
        defaultMessage: "A gateway is the radio that forwards the mesh over MQTT. You register its node ID so the packets have an owner.",
      }),
    },
    mesh: {
      title: formatMessage({ id: "page.start.basics.mesh.title", defaultMessage: "Mesh" }),
      body: formatMessage({
        id: "page.start.basics.mesh.body",
        defaultMessage: "A mesh is one radio network: a channel name and a key. Mesh Things decrypts what arrives on that channel.",
      }),
    },
    reading: {
      title: formatMessage({ id: "page.start.basics.reading.title", defaultMessage: "Reading" }),
      body: formatMessage({
        id: "page.start.basics.reading.body",
        defaultMessage: "A reading is one measurement from a node, stored after the packet is decrypted.",
      }),
    },
  };

  return (
    <div className="flex flex-col gap-5 text-pretty">
      <StepHeading>
        {formatMessage({ id: "page.start.basics.title", defaultMessage: "How readings arrive" })}
      </StepHeading>
      <p className="text-body-medium text-text-secondary">
        {formatMessage({
          id: "page.start.basics.lead",
          defaultMessage: "Nodes reach a gateway. The gateway publishes to MQTT, and Mesh Things stores the readings.",
        })}
      </p>
      <BasicsFigure selected={selected} />
      <div
        role="group"
        aria-label={formatMessage({ id: "page.start.basics.cards", defaultMessage: "Concepts" })}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {(Object.keys(copy) as BasicsConcept[]).map((id) => {
          const on = selected === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => setSelected(id)}
              className={cx(
                "flex flex-col oa-squircle border p-4 text-start transition-colors duration-150 motion-reduce:transition-none",
                on ? "border-accent-500" : "border-separator-border",
              )}
            >
              <span className="block text-body-medium text-text-primary">{copy[id].title}</span>
              <span className="mt-1 block text-body-2-regular text-text-secondary">{copy[id].body}</span>
            </button>
          );
        })}
      </div>
      <p className="text-body-2-regular text-text-secondary">
        <a className="underline" href={`${SITE_PATHS.docs}/concepts`}>
          {formatMessage({ id: "page.start.basics.docs", defaultMessage: "Read the concepts page" })}
        </a>
      </p>
      <Button type="button" size="medium" onClick={onContinue}>
        {formatMessage({ id: "page.start.basics.continue", defaultMessage: "Continue to your mesh" })}
      </Button>
    </div>
  );
}
