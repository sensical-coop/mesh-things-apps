import { type ReactElement } from "react";
import { LandingCta } from "./cta";
import { LandingExtras } from "./extras";
import { LandingFaq } from "./faq";
import { LandingFeatures } from "./features";
import { LandingFooter } from "./footer";
import { LandingHeader } from "./header";
import { LandingHero } from "./hero";
import { LandingProof } from "./proof";
import { LandingSteps } from "./steps";

export function LandingPage(): ReactElement {
  return (
    <div className="flex min-h-svh flex-col bg-background-full">
      <LandingHeader />
      <LandingHero />
      <main className="mx-auto flex w-full max-w-[76rem] flex-1 flex-col gap-12 px-4 pb-12 pt-12 sm:gap-20 sm:px-6 sm:pb-20 sm:pt-16">
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
