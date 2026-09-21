import { SITE } from "@/components/brand";
import { ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { LandingReveal } from "./reveal";

export function LandingCta(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <section
      id="get-started"
      className="oa-squircle scroll-mt-24 overflow-hidden border border-separator-border bg-text-primary p-2 sm:p-3"
    >
      <div className="flex flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-14">
        <LandingReveal>
          <h2 className="max-w-4xl text-balance text-title-1-medium tracking-tight text-background-full sm:text-display-3-medium">
            {formatMessage({ id: "page.home.cta.title", defaultMessage: "Contact us for deployment options" })}
          </h2>
        </LandingReveal>
        <LandingReveal className="mt-6">
          <p className="max-w-xl text-body-regular text-background-full/70">
            {formatMessage({
              id: "page.home.cta.subtitle",
              defaultMessage: "Feel free to check the demo, and reach out to us with any questions.",
            })}
          </p>
        </LandingReveal>
        <LandingReveal className="mt-8">
          <ButtonLink href={`${SITE}/contact`} size="medium">
            {formatMessage({ id: "page.home.cta.contactUs", defaultMessage: "Contact us" })}
          </ButtonLink>
        </LandingReveal>
      </div>
    </section>
  );
}
