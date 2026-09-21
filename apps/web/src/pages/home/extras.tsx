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
    bodyDefault: "Keep node identity, last seen, and readings next to the mesh they belong to.",
  },
  {
    id: "gateways",
    titleId: "page.home.extras.gateways.title",
    titleDefault: "Gateways you allow",
    bodyId: "page.home.extras.gateways.body",
    bodyDefault: "A registered gateway is permission to decode. Disallow it and that traffic stops being stored.",
  },
  {
    id: "channels",
    titleId: "page.home.extras.channels.title",
    titleDefault: "Channels and charts",
    bodyId: "page.home.extras.channels.body",
    bodyDefault: "Latest values as cards, then a series when you pick a channel, a window and an aggregation.",
  },
  {
    id: "operators",
    titleId: "page.home.extras.operators.title",
    titleDefault: "Built for operators",
    bodyId: "page.home.extras.operators.body",
    bodyDefault: "One owner login. Meshes, devices and blueprints in a single console.",
  },
  {
    id: "identity",
    titleId: "page.home.extras.identity.title",
    titleDefault: "Node identity",
    bodyId: "page.home.extras.identity.body",
    bodyDefault: "Short name, role and last packet, without turning the radio into a user profile.",
  },
  {
    id: "position",
    titleId: "page.home.extras.position.title",
    titleDefault: "Position when you want it",
    bodyId: "page.home.extras.position.body",
    bodyDefault:
      "Store location packets with the device they came from. The globe on this page is a sample, not live traffic.",
  },
  {
    id: "blueprints",
    titleId: "page.home.extras.blueprints.title",
    titleDefault: "Blueprints",
    bodyId: "page.home.extras.blueprints.body",
    bodyDefault: "Attach post-processing to a device when the raw channel is not the number you read.",
  },
  {
    id: "noBanner",
    titleId: "page.home.extras.noBanner.title",
    titleDefault: "No banner on this page",
    bodyId: "page.home.extras.noBanner.body",
    bodyDefault: "The marketing page sets no analytics cookies. The console uses a session cookie after you sign in.",
  },
  {
    id: "lora",
    titleId: "page.home.extras.lora.title",
    titleDefault: "The radio stays LoRa",
    bodyId: "page.home.extras.lora.body",
    bodyDefault: "This is storage and a console. The mesh keeps running the way you already run it.",
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
            defaultMessage="The radio stays LoRa. <secondary>The history lives here.</secondary>"
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
