import { ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { BrandMark } from "@mtt/ui/components/brand-mark";
import { cx } from "@mtt/ui/utils";
import { RiGithubLine, RiLinkedinLine } from "@remixicon/react";
import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { API_URL } from "@mtt/contracts/runtime";
import { FooterColumn } from "@/footer-column";
import { CONTACT_URL, COPYRIGHT, SITE, pageWidth, siteLinkClass } from "@/components/brand";
import { NAV_PRODUCT } from "@/nav-items";

const socials = [
  { href: "https://github.com/sensical-coop/", label: "GitHub", icon: RiGithubLine },
  {
    href: "https://www.linkedin.com/company/sensical-sccl/",
    label: "LinkedIn",
    icon: RiLinkedinLine,
  },
] as const;

export function Footer(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <footer
      className={cx(
        pageWidth,
        "mt-auto flex flex-col gap-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:pb-[max(2.5rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between sm:gap-16">
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
              id: "console.footer.tagline",
              defaultMessage: "Storage and management interface for Meshtastic-based sensor networks. Built by Sensical SCCL in Barcelona.",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-10">
          <FooterColumn title={formatMessage({ id: "console.footer.product", defaultMessage: "Product" })}>
            <nav aria-label="Product" className="flex flex-col gap-2">
              {NAV_PRODUCT.map((item) => (
                <Link key={item.to} to={item.to} className={siteLinkClass}>
                  {formatMessage(item.label)}
                </Link>
              ))}
            </nav>
          </FooterColumn>
          <FooterColumn title="Sensical">
            <nav aria-label="Sensical" className="flex flex-col gap-2">
              <a href={SITE} className={siteLinkClass}>
                {formatMessage({ id: "console.footer.website", defaultMessage: "Website" })}
              </a>
              <a href={CONTACT_URL} className={siteLinkClass}>
                {formatMessage({ id: "console.footer.contact", defaultMessage: "Contact" })}
              </a>
              <a href={API_URL} className={siteLinkClass}>
                {formatMessage({ id: "console.footer.api", defaultMessage: "API" })}
              </a>
            </nav>
          </FooterColumn>
        </div>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption-1-medium text-text-tertiary">{COPYRIGHT}</p>
        <ul className="flex gap-2">
          {socials.map((social) => (
            <li key={social.href}>
              <ButtonLink
                href={social.href}
                target="_blank"
                rel="noreferrer"
                variant="secondary"
                size="small"
                iconOnly
                leadingIcon={social.icon}
                aria-label={social.label}
                className="rounded-full"
              />
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
