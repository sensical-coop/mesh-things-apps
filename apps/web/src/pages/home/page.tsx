import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { LandingCta } from "./cta";
import { LandingExtras } from "./extras";
import { LandingFaq } from "./faq";
import { LandingFeatures } from "./features";
import { LandingFooter } from "@/components/landing-footer";
import { SiteHeader, siteHeaderLinkClass } from "@/components/site-header";
import { LandingHero } from "./hero";
import { LandingProof } from "./proof";
import { LandingSteps } from "./steps";

function LandingNav(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <>
      <a href="/#why" className={siteHeaderLinkClass}>
        {formatMessage({ id: "page.home.header.howItWorks", defaultMessage: "How it works" })}
      </a>
      <a href="/#features" className={siteHeaderLinkClass}>
        {formatMessage({ id: "page.home.header.features", defaultMessage: "Features" })}
      </a>
      <a href="/#faq" className={siteHeaderLinkClass}>
        {formatMessage({ id: "page.home.header.faq", defaultMessage: "FAQ" })}
      </a>
    </>
  );
}

export function LandingPage(): ReactElement {
  return (
    <div className="flex min-h-svh flex-col bg-background-full">
      <SiteHeader nav={<LandingNav />} />
      <LandingHero />
      <main className="mx-auto flex w-full max-w-304 flex-1 flex-col gap-12 px-4 py-12  sm:gap-20 sm:px-6 sm:pt-16 sm:pb-20">
        <LandingProof />
        <LandingSteps />
        <LandingFeatures />
        <LandingExtras />
        <LandingFaq />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
