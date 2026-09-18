import { routes } from "@/router";
import { ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { LandingCobe } from "./cobe";
import { LandingReveal } from "./reveal";

export function LandingHero({ signedIn }: { signedIn: boolean }): ReactElement {
  return (
    <section className="relative -mt-16 min-h-dvh overflow-hidden sm:-mt-20">
      <div className="relative z-10 mx-auto max-w-4xl px-4 pt-36 text-center sm:px-6 sm:pt-44">
        <LandingReveal delayMs={80}>
          <h1 className="text-balance text-display-3-medium tracking-tight text-text-primary sm:text-display-2-medium">
            The world&apos;s first{" "}
            <span className="text-accent-500">storage and data solution for Meshtastic</span>
          </h1>
        </LandingReveal>
        <LandingReveal delayMs={160}>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-title-3-regular text-text-secondary sm:text-title-1-regular">
            Keep mesh inventory, gateway permission and channel history in one place,{" "}
            <span className="rounded-md bg-accent-500/10 px-1 py-0.5 text-accent-500">without a spreadsheet export.</span>
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <ButtonLink href={routes.login} size="medium">
              Sign in
            </ButtonLink>
            {signedIn ? (
              <ButtonLink href={routes.meshes} variant="secondary" size="medium">
                Open console
              </ButtonLink>
            ) : (
              <ButtonLink href={routes.login} variant="secondary" size="medium">
                See the product
              </ButtonLink>
            )}
          </div>
        </LandingReveal>
      </div>
      <LandingCobe />
    </section>
  );
}
