import { RiArrowDownSLine } from "@remixicon/react";
import { type ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { richTextValues } from "@/lib/intl-tags";
import { LandingReveal } from "./reveal";

const faqs = [
  {
    id: "meshtastic",
    qId: "page.home.faq.meshtastic.q",
    qDefault: "What is Mesh Things?",
    aId: "page.home.faq.meshtastic.a",
    aDefault:
      "A storage and data layer for Meshtastic networks and telemetry data. The data comes from MQQT and gets stored and processed in Mesh Things. Mesh Things can be deployed locally on a Raspberry Pi or on a cloud server.",
  },
  {
    id: "federated",
    qId: "page.home.faq.federated.q",
    qDefault: "Can data be shared across instances?",
    aId: "page.home.faq.federated.a",
    aDefault: "Yes, you can keep data local or send it to a cloud server.",
  },
  {
    id: "globe",
    qId: "page.home.faq.globe.q",
    qDefault: "Is the platform open source?",
    aId: "page.home.faq.globe.a",
    aDefault:
      "Yes, we are working on releasing the platform and it's front-end application. Stay tuned for more news, and feel free to contact us for more information.",
  },
  {
    id: "signIn",
    qId: "page.home.faq.signIn.q",
    qDefault: "Who can sign in?",
    aId: "page.home.faq.signIn.a",
    aDefault:
      "Anyone can register an owner account in the demo server. Storage of data in the demo server is not guaranteed yet. Feel free to contact us for more information and deployment options.",
  },
] as const;

export function LandingFaq(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <section id="faq" className="scroll-mt-24">
      <LandingReveal>
        <h2 className="mx-auto max-w-2xl text-center text-title-1-medium tracking-tight text-balance text-text-primary sm:text-display-3-medium">
          <FormattedMessage
            id="page.home.faq.heading"
            defaultMessage="Frequently asked <secondary>questions</secondary>"
            values={richTextValues}
          />
        </h2>
      </LandingReveal>
      <LandingReveal className="mx-auto mt-12 w-full max-w-2xl sm:mt-16">
        <div>
          {faqs.map((item) => (
            <details key={item.id} className="group border-b border-separator-border">
              <summary className="flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-4 px-1 text-left text-body-medium text-text-primary outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus-ring [&::-webkit-details-marker]:hidden">
                {formatMessage({ id: item.qId, defaultMessage: item.qDefault })}
                <RiArrowDownSLine className="size-4 shrink-0 text-foreground-icon-tertiary transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="px-1 pb-4 text-body-regular text-text-secondary">
                {formatMessage({ id: item.aId, defaultMessage: item.aDefault })}
              </p>
            </details>
          ))}
        </div>
      </LandingReveal>
    </section>
  );
}
