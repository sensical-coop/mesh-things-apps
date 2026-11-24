import { BrandMark } from "@mtt/ui/components/brand-mark";
import { CONTACT_URL, COPYRIGHT, SITE, siteLinkClass } from "@/components/brand";
import { LANDING_SECTIONS } from "@/components/landing-sections";
import { routes } from "@/router";
import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export function LandingFooter(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <footer className="mx-auto w-full max-w-304 px-4 pb-12 sm:px-6 sm:pb-20">
      <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <a
            href={SITE}
            aria-label="Sensical"
            className="w-fit rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <BrandMark className="h-3.5" />
          </a>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.home.footer.tagline",
              defaultMessage: "Storage and a console for Meshtastic networks. Built by Sensical SCCL in Barcelona.",
            })}
          </p>
        </div>
        <nav aria-label="Landing" className="flex flex-wrap gap-x-10 gap-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-caption-1-medium tracking-label text-text-tertiary uppercase">
              {formatMessage({ id: "page.home.footer.product", defaultMessage: "Product" })}
            </p>
            {LANDING_SECTIONS.map((section) => (
              <a key={section.href} href={section.href} className={siteLinkClass}>
                {formatMessage(section.label)}
              </a>
            ))}
            <Link to={routes.login} className={siteLinkClass}>
              {formatMessage({ id: "page.home.header.signIn", defaultMessage: "Sign in" })}
            </Link>
            <Link to={routes.signup} className={siteLinkClass}>
              {formatMessage({ id: "page.home.header.signUp", defaultMessage: "Sign up" })}
            </Link>
            <Link to={routes.terms} className={siteLinkClass}>
              {formatMessage({ id: "page.home.header.terms", defaultMessage: "Terms" })}
            </Link>
            <Link to={routes.dpa} className={siteLinkClass}>
              {formatMessage({ id: "page.home.footer.dpa", defaultMessage: "Data processing" })}
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-caption-1-medium tracking-label text-text-tertiary uppercase">Sensical</p>
            <a href={SITE} className={siteLinkClass}>
              {formatMessage({ id: "page.home.footer.website", defaultMessage: "Website" })}
            </a>
            <a href={CONTACT_URL} className={siteLinkClass}>
              {formatMessage({ id: "page.home.footer.contact", defaultMessage: "Contact" })}
            </a>
          </div>
        </nav>
      </div>
      <p className="mt-10 text-caption-1-medium text-text-tertiary">{COPYRIGHT}</p>
    </footer>
  );
}
