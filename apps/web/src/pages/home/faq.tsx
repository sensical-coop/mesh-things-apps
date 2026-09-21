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
      "A storage and data layer for Meshtastic networks: meshes, gateways, nodes and the telemetry they produce.",
  },
  {
    id: "cookies",
    qId: "page.home.faq.cookies.q",
    qDefault: "Do I need a cookie banner to use the product?",
    aId: "page.home.faq.cookies.a",
    aDefault:
      "This marketing page sets no analytics cookies. The console uses a session cookie after you sign in, so that the API knows who you are.",
  },
  {
    id: "globe",
    qId: "page.home.faq.globe.q",
    qDefault: "Is the globe live traffic?",
    aId: "page.home.faq.globe.a",
    aDefault:
      "No. It is a sample mesh over the western Mediterranean, drawn so you can see hops between gateways and nodes.",
  },
  {
    id: "signIn",
    qId: "page.home.faq.signIn.q",
    qDefault: "Who can sign in?",
    aId: "page.home.faq.signIn.a",
    aDefault:
      "Anyone can register an account. A new account stays inactive until you confirm the email address you signed up with.",
  },
] as const;

export function LandingFaq(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <section id="faq" className="scroll-mt-24">
      <LandingReveal>
        <h2 className="mx-auto max-w-2xl text-balance text-center text-title-1-medium tracking-tight text-text-primary sm:text-display-3-medium">
          <FormattedMessage
            id="page.home.faq.heading"
            defaultMessage="Fair questions, <secondary>straight answers.</secondary>"
            values={richTextValues}
          />
        </h2>
      </LandingReveal>
      <LandingReveal className="mx-auto mt-12 w-full max-w-2xl sm:mt-16">
        <div>
          {faqs.map((item) => (
            <details key={item.id} className="group border-b border-separator-border">
              <summary className="flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-4 px-1 text-left text-body-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring [&::-webkit-details-marker]:hidden">
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
