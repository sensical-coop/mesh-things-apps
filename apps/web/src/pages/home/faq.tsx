import { RiArrowDownSLine } from "@remixicon/react";
import { type ReactElement } from "react";
import { LandingReveal } from "./reveal";

const faqs = [
  {
    q: "What is Meshtastic Things?",
    a: "A storage and data layer for Meshtastic networks: meshes, gateways, nodes and the telemetry they produce.",
  },
  {
    q: "Do I need a cookie banner to use the product?",
    a: "This marketing page sets no analytics cookies. The console uses a session cookie after you sign in, so that the API knows who you are.",
  },
  {
    q: "Is the globe live traffic?",
    a: "No. It is a sample mesh over the western Mediterranean, drawn so you can see hops between gateways and nodes.",
  },
  {
    q: "Who can sign in?",
    a: "Phase 1 is one owner login. There is no public register and no API keys on this site.",
  },
] as const;

export function LandingFaq(): ReactElement {
  return (
    <section id="faq" className="scroll-mt-24">
      <LandingReveal>
        <h2 className="mx-auto max-w-2xl text-balance text-center text-title-1-medium tracking-tight text-text-primary sm:text-display-3-medium">
          Fair questions, <span className="text-text-secondary">straight answers.</span>
        </h2>
      </LandingReveal>
      <LandingReveal className="mx-auto mt-12 w-full max-w-2xl sm:mt-16">
        <div>
          {faqs.map((item) => (
            <details key={item.q} className="group border-b border-separator-border">
              <summary className="flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-4 px-1 text-left text-body-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring [&::-webkit-details-marker]:hidden">
                {item.q}
                <RiArrowDownSLine className="size-4 shrink-0 text-foreground-icon-tertiary transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="px-1 pb-4 text-body-regular text-text-secondary">{item.a}</p>
            </details>
          ))}
        </div>
      </LandingReveal>
    </section>
  );
}
