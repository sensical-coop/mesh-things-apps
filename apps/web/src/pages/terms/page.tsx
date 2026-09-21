// Placeholder legal copy. To be replaced
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { LandingFooter } from "@/pages/home/footer";
import { LandingHeader } from "@/pages/home/header";

const sections = [
  {
    id: "acceptance",
    headingId: "page.terms.acceptance.heading",
    headingDefault: "Acceptance of these terms",
    bodyId: "page.terms.acceptance.body",
    bodyDefault:
      "By creating an owner account you agree to these terms and to our handling of your data as described below.",
  },
  {
    id: "use",
    headingId: "page.terms.use.heading",
    headingDefault: "Use of the service",
    bodyId: "page.terms.use.body",
    bodyDefault:
      "Meshtastic Things is a storage and console layer for Meshtastic networks. You are responsible for the meshes, devices and data you register under your account.",
  },
  {
    id: "accounts",
    headingId: "page.terms.accounts.heading",
    headingDefault: "Accounts and email verification",
    bodyId: "page.terms.accounts.body",
    bodyDefault:
      "A new account stays inactive until you confirm the email address you registered with. You are responsible for keeping your password and API keys confidential.",
  },
  {
    id: "data",
    headingId: "page.terms.data.heading",
    headingDefault: "Data",
    bodyId: "page.terms.data.body",
    bodyDefault: "Telemetry and configuration you submit is stored to operate the service and is not sold to third parties.",
  },
  {
    id: "termination",
    headingId: "page.terms.termination.heading",
    headingDefault: "Termination",
    bodyId: "page.terms.termination.body",
    bodyDefault: "You may delete your account at any time from the console. We may suspend accounts that abuse the service.",
  },
  {
    id: "changes",
    headingId: "page.terms.changes.heading",
    headingDefault: "Changes to these terms",
    bodyId: "page.terms.changes.body",
    bodyDefault:
      "We may update these terms as the product evolves. Continued use of the service after a change constitutes acceptance.",
  },
  {
    id: "contact",
    headingId: "page.terms.contact.heading",
    headingDefault: "Contact",
    bodyId: "page.terms.contact.body",
    bodyDefault: "Questions about these terms can be sent to Sensical SCCL through the contact page linked in the footer.",
  },
] as const;

export function TermsPage(): ReactElement {
  const { formatMessage } = useIntl();

  return (
    <div className="flex min-h-svh flex-col bg-background-full">
      <LandingHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 pb-12 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-1-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.terms.title", defaultMessage: "Terms and Conditions" })}
          </h1>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({ id: "page.terms.lastUpdated", defaultMessage: "Last updated 2026-09-19." })}
          </p>
        </div>
        <div className="flex flex-col gap-6">
          {sections.map((section) => (
            <section key={section.id} className="flex flex-col gap-2">
              <h2 className="text-title-3-medium text-text-primary">
                {formatMessage({ id: section.headingId, defaultMessage: section.headingDefault })}
              </h2>
              <p className="text-body-regular text-text-secondary">
                {formatMessage({ id: section.bodyId, defaultMessage: section.bodyDefault })}
              </p>
            </section>
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
