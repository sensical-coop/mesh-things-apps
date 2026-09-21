import { routes } from "@/router";
import { ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { richTextValues } from "@/lib/intl-tags";
import { LandingCobe } from "./cobe";
import { LandingReveal } from "./reveal";

export function LandingHero(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <section className="relative -mt-16 min-h-dvh overflow-hidden sm:-mt-20">
      <div className="relative z-10 mx-auto max-w-4xl px-4 pt-36 text-center sm:px-6 sm:pt-44">
        <LandingReveal delayMs={80}>
          <h1 className="text-balance text-display-3-medium tracking-tight text-text-primary sm:text-display-2-medium">
            <FormattedMessage
              id="page.home.hero.title"
              defaultMessage="The world's first <accent>storage and data solution for Meshtastic</accent>"
              values={richTextValues}
            />
          </h1>
        </LandingReveal>
        <LandingReveal delayMs={160}>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-title-3-regular text-text-secondary sm:text-title-1-regular">
            <FormattedMessage
              id="page.home.hero.subtitle"
              defaultMessage="Keep mesh inventory, gateway permission and channel history in one place, <highlight>without a spreadsheet export.</highlight>"
              values={richTextValues}
            />
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <ButtonLink href={routes.login} size="medium">
              {formatMessage({ id: "page.home.hero.signIn", defaultMessage: "Sign in" })}
            </ButtonLink>
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
