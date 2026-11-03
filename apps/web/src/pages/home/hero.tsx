import { routes } from "@/router";
import { ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { richTextValues } from "@/lib/intl-tags";
import { LandingCobe } from "./cobe";
import { LandingReveal } from "./reveal";
import { RouterButtonLink } from "@/components/router-button-link";

export function LandingHero(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <section className="relative -mt-16 min-h-dvh overflow-hidden sm:-mt-20">
      <div className="relative z-10 mx-auto max-w-4xl px-4 pt-36 text-center sm:px-6 sm:pt-44">
        <LandingReveal delayMs={80}>
          <h1 className="text-balance text-display-3-medium tracking-tight text-text-primary sm:text-display-2-medium">
            <FormattedMessage
              id="page.home.hero.title"
              defaultMessage="The world's first <accent>storage and data solution for Meshtastic sensors</accent>"
              values={richTextValues}
            />
          </h1>
        </LandingReveal>
        <LandingReveal delayMs={160}>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-title-3-regular text-text-secondary sm:text-title-1-regular">
            <FormattedMessage
              id="page.home.hero.subtitle"
              defaultMessage="Collect sensor data with <highlight>Meshtastic based sensor networks.</highlight> Deploy locally or on the cloud."
              values={richTextValues}
            />
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <RouterButtonLink to={routes.login} size="medium">
              {formatMessage({ id: "page.home.hero.signIn", defaultMessage: "Sign in" })}
            </RouterButtonLink>
            <ButtonLink href="#proof" variant="secondary" size="medium">
              {formatMessage({ id: "page.home.hero.howItWorks", defaultMessage: "How it works" })}
            </ButtonLink>
          </div>
        </LandingReveal>
      </div>
      <LandingCobe />
    </section>
  );
}
