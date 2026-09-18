import { type ReactElement } from "react";
import { LandingReveal } from "./reveal";

const extras = [
  {
    title: "Storage for the mesh",
    body: "Keep node identity, last seen, and readings next to the mesh they belong to.",
  },
  {
    title: "Gateways you allow",
    body: "A registered gateway is permission to decode. Disallow it and that traffic stops being stored.",
  },
  {
    title: "Channels and charts",
    body: "Latest values as cards, then a series when you pick a channel, a window and an aggregation.",
  },
  {
    title: "Built for operators",
    body: "One owner login. Meshes, devices and blueprints in a single console.",
  },
  {
    title: "Node identity",
    body: "Short name, role and last packet, without turning the radio into a user profile.",
  },
  {
    title: "Position when you want it",
    body: "Store location packets with the device they came from. The globe on this page is a sample, not live traffic.",
  },
  {
    title: "Blueprints",
    body: "Attach post-processing to a device when the raw channel is not the number you read.",
  },
  {
    title: "No banner on this page",
    body: "The marketing page sets no analytics cookies. The console uses a session cookie after you sign in.",
  },
  {
    title: "The radio stays LoRa",
    body: "This is storage and a console. The mesh keeps running the way you already run it.",
  },
] as const;

export function LandingExtras(): ReactElement {
  return (
    <section id="more" className="scroll-mt-24">
      <LandingReveal>
        <h2 className="mx-auto max-w-2xl text-balance text-center text-title-1-medium tracking-tight text-text-primary sm:text-display-3-medium">
          The radio stays LoRa.{" "}
          <span className="text-text-secondary">The history lives here.</span>
        </h2>
      </LandingReveal>
      <LandingReveal className="mt-12 sm:mt-16">
        <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {extras.map((item) => (
            <li key={item.title} className="landing-plate oa-squircle shadow-card flex flex-col gap-3 p-6 sm:p-8">
              <h3 className="text-title-3-medium text-text-primary">{item.title}</h3>
              <p className="text-body-regular text-text-secondary">{item.body}</p>
            </li>
          ))}
        </ul>
      </LandingReveal>
    </section>
  );
}
