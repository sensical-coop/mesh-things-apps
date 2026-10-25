import { BrandMark, SITE } from "@/components/brand";
import { routes } from "@/router";
import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

const linkClass =
  "rounded-full text-body-medium text-text-secondary outline-hidden hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring";

export function LandingFooter(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <footer className="mx-auto w-full max-w-[76rem] px-4 pb-12 sm:px-6 sm:pb-20">
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
            <p className="text-caption-1-medium tracking-[0.12em] text-text-tertiary uppercase">
              {formatMessage({ id: "page.home.footer.product", defaultMessage: "Product" })}
            </p>
            <a href="/#why" className={linkClass}>
              {formatMessage({ id: "page.home.header.howItWorks", defaultMessage: "How it works" })}
            </a>
            <a href="/#features" className={linkClass}>
              {formatMessage({ id: "page.home.header.features", defaultMessage: "Features" })}
            </a>
            <a href="/#faq" className={linkClass}>
              {formatMessage({ id: "page.home.header.faq", defaultMessage: "FAQ" })}
            </a>
            <Link to={routes.login} className={linkClass}>
              {formatMessage({ id: "page.home.header.signIn", defaultMessage: "Sign in" })}
            </Link>
            <Link to={routes.signup} className={linkClass}>
              {formatMessage({ id: "page.home.header.signUp", defaultMessage: "Sign up" })}
            </Link>
            <Link to={routes.terms} className={linkClass}>
              {formatMessage({ id: "page.home.header.terms", defaultMessage: "Terms" })}
            </Link>
            <Link to={routes.dpa} className={linkClass}>
              {formatMessage({ id: "page.home.footer.dpa", defaultMessage: "Data processing" })}
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-caption-1-medium tracking-[0.12em] text-text-tertiary uppercase">Sensical</p>
            <a href={SITE} className={linkClass}>
              {formatMessage({ id: "page.home.footer.website", defaultMessage: "Website" })}
            </a>
            <a href={`${SITE}/contact`} className={linkClass}>
              {formatMessage({ id: "page.home.footer.contact", defaultMessage: "Contact" })}
            </a>
          </div>
        </nav>
      </div>
      <p className="mt-10 text-caption-1-medium text-text-tertiary">© 2026 Sensical SCCL</p>
    </footer>
  );
}
