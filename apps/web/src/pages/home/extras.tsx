import { type ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { richTextValues } from "@/lib/intl-tags";
import { LandingReveal } from "./reveal";

const extras = [
  {
    id: "storage",
    titleId: "page.home.extras.storage.title",
    titleDefault: "Storage for the mesh",
    bodyId: "page.home.extras.storage.body",
    bodyDefault: "Timeseries storage for Meshtastic-based sensor networks.",
  },
  {
    id: "gateways",
    titleId: "page.home.extras.gateways.title",
    titleDefault: "Choose the data publishers",
    bodyId: "page.home.extras.gateways.body",
    bodyDefault: "A registered gateway allows data ingestion. Disallow it and that traffic stops being stored.",
  },
  {
    id: "channels",
    titleId: "page.home.extras.channels.title",
    titleDefault: "Visualize your data",
    bodyId: "page.home.extras.channels.body",
    bodyDefault: "Check latest values and historic readings.",
  },
  {
    id: "operators",
    titleId: "page.home.extras.operators.title",
    titleDefault: "Built for everyone",
    bodyId: "page.home.extras.operators.body",
    bodyDefault: "Deployment is simple, and data is easily accessible.",
  },
  {
    id: "identity",
    titleId: "page.home.extras.identity.title",
    titleDefault: "Control your nodes",
    bodyId: "page.home.extras.identity.body",
    bodyDefault: "Enable or disable data ingestion per node.",
  },
  {
    id: "position",
    titleId: "page.home.extras.position.title",
    titleDefault: "Location as an option",
    bodyId: "page.home.extras.position.body",
    bodyDefault: "Store location packets directly or choose to keep location private.",
  },
  {
    id: "blueprints",
    titleId: "page.home.extras.blueprints.title",
    titleDefault: "Data processing",
    bodyId: "page.home.extras.blueprints.body",
    bodyDefault: "Attach post-processing to a device when the raw channel needs algorithms.",
  },
  {
    id: "noBanner",
    titleId: "page.home.extras.noBanner.title",
    titleDefault: "Trigger alarms",
    bodyId: "page.home.extras.noBanner.body",
    bodyDefault: "Trigger alarms for sensor data in real time to any devices.",
  },
  {
    id: "lora",
    titleId: "page.home.extras.lora.title",
    titleDefault: "Access your data",
    bodyId: "page.home.extras.lora.body",
    bodyDefault: "REST API available as well as S3 bucket storage.",
  },
] as const;

export function LandingExtras(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <section id="more" className="scroll-mt-24">
      <LandingReveal>
        <h2 className="mx-auto max-w-2xl text-balance text-center text-title-1-medium tracking-tight text-text-primary sm:text-display-3-medium">
          <FormattedMessage
            id="page.home.extras.heading"
            defaultMessage="Choose your deployment type. <secondary>For your sensors and your platform.</secondary>"
            values={richTextValues}
          />
        </h2>
      </LandingReveal>
      <LandingReveal className="mt-12 sm:mt-16">
        <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {extras.map((item) => (
            <li key={item.id} className="landing-plate oa-squircle shadow-card flex flex-col gap-3 p-6 sm:p-8">
              <h3 className="text-title-3-medium text-text-primary">
                {formatMessage({ id: item.titleId, defaultMessage: item.titleDefault })}
              </h3>
              <p className="text-body-regular text-text-secondary">
                {formatMessage({ id: item.bodyId, defaultMessage: item.bodyDefault })}
              </p>
            </li>
          ))}
        </ul>
      </LandingReveal>
    </section>
  );
}
