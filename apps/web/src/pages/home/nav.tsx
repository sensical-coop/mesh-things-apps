import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { siteLinkClass } from "@/components/brand";
import { LANDING_SECTIONS } from "@/components/landing-sections";

export function LandingNav(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <>
      {LANDING_SECTIONS.map((section) => (
        <a key={section.href} href={section.href} className={siteLinkClass}>
          {formatMessage(section.label)}
        </a>
      ))}
    </>
  );
}
