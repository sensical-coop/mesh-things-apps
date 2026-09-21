import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { LandingFooter } from "@/pages/home/footer";
import { LandingHeader } from "@/pages/home/header";

const termsOfUse = [
  {
    id: "relationship",
    headingId: "page.terms.tou.relationship.heading",
    headingDefault: "1. Your relationship with Sensical",
    bodyId: "page.terms.tou.relationship.body",
    bodyDefault:
      'Your use of the Mesh Things website and console (the "Platform") is governed by a legal agreement between you and Sensical SCCL, a cooperative based in Barcelona, Spain ("Sensical", "we"). By using the Platform you accept these Terms of Use and the Privacy Policy below, together the "Terms".',
  },
  {
    id: "accepting",
    headingId: "page.terms.tou.accepting.heading",
    headingDefault: "2. Accepting these Terms",
    bodyId: "page.terms.tou.accepting.body",
    bodyDefault:
      "These Terms apply to anyone who creates an owner account, registers a mesh or device, or otherwise uses the Platform. If you don't agree with them, stop using the Platform; continuing to use it after creating an account means you accept them.",
  },
  {
    id: "changes-terms",
    headingId: "page.terms.tou.changesTerms.heading",
    headingDefault: "3. Changes to these Terms",
    bodyId: "page.terms.tou.changesTerms.body",
    bodyDefault:
      "We may update these Terms as the product evolves, for example to reflect new features or legal requirements. We'll do our best to give notice of material changes, and the current version is always available on this page. Continued use of the Platform after a change takes effect means you accept the revised Terms.",
  },
  {
    id: "platform",
    headingId: "page.terms.tou.platform.heading",
    headingDefault: "4. The Mesh Things Platform",
    bodyId: "page.terms.tou.platform.body",
    bodyDefault:
      "Mesh Things is a storage and console layer for Meshtastic networks: it lets you register meshes and devices, ingest telemetry, and configure alarms and blueprints through the console. We don't manufacture or sell hardware — you're responsible for the Meshtastic devices and networks you connect to it. api.sensical.es and things.sensical.es are a demo instance of Mesh Things.",
  },
  {
    id: "account",
    headingId: "page.terms.tou.account.heading",
    headingDefault: "5. Creating an owner account",
    bodyId: "page.terms.tou.account.body",
    bodyDefault:
      "To use the console you need to create an owner account with a name, email address and password. A new account stays inactive until you confirm your email address, and you're responsible for keeping your password and API keys confidential and for all activity under your account. If you suspect unauthorized use of your account, change your password immediately and notify us at info@sensical.es.",
  },
  {
    id: "platform-changes",
    headingId: "page.terms.tou.platformChanges.heading",
    headingDefault: "6. Changes to the Platform",
    bodyId: "page.terms.tou.platformChanges.body",
    bodyDefault:
      "We may add, change or remove features of the Platform at any time, including limits on storage, request rates or API usage, with or without notice. We aren't liable for loss resulting from such changes.",
  },
  {
    id: "termination",
    headingId: "page.terms.tou.termination.heading",
    headingDefault: "7. Termination",
    bodyId: "page.terms.tou.termination.body",
    bodyDefault:
      "You may delete your account at any time from the console profile page, which removes your account and its access. We may suspend or close accounts that violate these Terms or otherwise abuse the service, and will try to notify you by email beforehand where practical.",
  },
  {
    id: "third-party",
    headingId: "page.terms.tou.thirdParty.heading",
    headingDefault: "8. Third-party links and services",
    bodyId: "page.terms.tou.thirdParty.body",
    bodyDefault:
      "The Platform may link to third-party sites or rely on third-party infrastructure, such as our hosting provider. We aren't responsible for the content, availability or practices of services we don't control.",
  },
  {
    id: "high-risk",
    headingId: "page.terms.tou.highRisk.heading",
    headingDefault: "9. High-risk uses",
    bodyId: "page.terms.tou.highRisk.body",
    bodyDefault:
      "The Platform is not designed, tested or intended for use in situations where a failure or delay in telemetry could cause death, personal injury, or severe property or environmental damage. Don't rely on it as the sole safeguard for such uses.",
  },
  {
    id: "indemnity",
    headingId: "page.terms.tou.indemnity.heading",
    headingDefault: "10. Indemnity",
    bodyId: "page.terms.tou.indemnity.body",
    bodyDefault:
      "You agree to hold Sensical harmless from claims arising out of your misuse of the Platform or a violation of these Terms, including claims related to data you register or content you upload.",
  },
  {
    id: "governing-law",
    headingId: "page.terms.tou.governingLaw.heading",
    headingDefault: "11. Governing law",
    bodyId: "page.terms.tou.governingLaw.body",
    bodyDefault:
      "These Terms are governed by Spanish law. Disputes arising from them will be handled by the courts of Barcelona, Spain, except where mandatory consumer-protection rules require otherwise.",
  },
  {
    id: "using-platform",
    headingId: "page.terms.tou.usingPlatform.heading",
    headingDefault: "12. Using the Platform and registering mesh data",
    bodyId: "page.terms.tou.usingPlatform.body",
    bodyDefault:
      "If you register meshes, devices or telemetry under your account, you're responsible for the accuracy and legality of that data and for the devices you connect. We don't screen or verify device data before storing it, and storing it doesn't make us liable for its content or accuracy.",
  },
  {
    id: "accessing-data",
    headingId: "page.terms.tou.accessingData.heading",
    headingDefault: "13. Accessing mesh and device data",
    bodyId: "page.terms.tou.accessingData.body",
    bodyDefault:
      "Meshes and devices you register are private to your account by default — only you, and other owners you explicitly grant access to, can read their configuration and telemetry. We don't publish your mesh or device data to third parties or make it publicly searchable.",
  },
] as const;

const privacyPolicy = [
  {
    id: "purpose",
    headingId: "page.terms.privacy.purpose.heading",
    headingDefault: "1. Purpose of this Privacy Policy",
    bodyId: "page.terms.privacy.purpose.body",
    bodyDefault:
      "This Privacy Policy applies to the personal data Sensical collects through your use of the Platform. Terms defined in the Terms of Use above have the same meaning here.",
  },
  {
    id: "changes-privacy",
    headingId: "page.terms.privacy.changesPrivacy.heading",
    headingDefault: "2. Changes to this Privacy Policy",
    bodyId: "page.terms.privacy.changesPrivacy.body",
    bodyDefault:
      "We may update this Privacy Policy as the Platform evolves. Any revised version, with its effective date, will be published on this page. If you disagree with a change, you can close your account before it takes effect.",
  },
  {
    id: "data-processed",
    headingId: "page.terms.privacy.dataProcessed.heading",
    headingDefault: "3. Personal data we process",
    bodyId: "page.terms.privacy.dataProcessed.body",
    bodyDefault:
      "To operate your account we collect your name, email address, and password, which is stored as a salted hash. We also store the meshes, devices and telemetry you register, but we don't process that data for our own purposes beyond operating the service.",
  },
  {
    id: "processing-purposes",
    headingId: "page.terms.privacy.processingPurposes.heading",
    headingDefault: "4. Processing purposes",
    bodyId: "page.terms.privacy.processingPurposes.body",
    bodyDefault:
      "We process your account data to create and maintain your account, operate the console, respond to support requests, and send service email such as verification and password-reset messages. The marketing site sets no analytics cookies, and the console only sets a session cookie once you sign in, so the API knows who you are.",
  },
  {
    id: "data-sharing",
    headingId: "page.terms.privacy.dataSharing.heading",
    headingDefault: "5. Personal data communication",
    bodyId: "page.terms.privacy.dataSharing.body",
    bodyDefault:
      "We don't sell or rent your personal data. We only share it when you've asked us to, when needed to investigate abuse or enforce these Terms, or when required by law.",
  },
  {
    id: "your-rights",
    headingId: "page.terms.privacy.yourRights.heading",
    headingDefault: "6. Your rights",
    bodyId: "page.terms.privacy.yourRights.body",
    bodyDefault:
      "You can ask to access, correct, export or delete your personal data at any time. You can delete your own account and its data from the console profile page, or reach us through the contact page linked in the footer for anything it doesn't cover.",
  },
  {
    id: "data-storage",
    headingId: "page.terms.privacy.dataStorage.heading",
    headingDefault: "7. Data storage and transmission",
    bodyId: "page.terms.privacy.dataStorage.body",
    bodyDefault:
      "Your account and mesh data are stored on servers located in the European Union. By using the Platform you agree to your data being hosted and processed there.",
  },
  {
    id: "security",
    headingId: "page.terms.privacy.security.heading",
    headingDefault: "8. Security of your data",
    bodyId: "page.terms.privacy.security.body",
    bodyDefault:
      "We take reasonable steps to protect your data, including transport encryption and access controls, but no transmission over the internet is completely secure. If we become aware of a security breach affecting your data, we'll notify you by email or through a notice on the Platform.",
  },
  {
    id: "other-sites",
    headingId: "page.terms.privacy.otherSites.heading",
    headingDefault: "9. Other websites and applications",
    bodyId: "page.terms.privacy.otherSites.body",
    bodyDefault:
      "The Platform may link to other websites. We aren't responsible for their privacy practices — review their own policies before sharing information with them.",
  },
  {
    id: "data-controller",
    headingId: "page.terms.privacy.dataController.heading",
    headingDefault: "10. Data controller and contact",
    bodyId: "page.terms.privacy.dataController.body",
    bodyDefault:
      "The data controller for the personal data described above is Sensical SCCL, Barcelona, Spain. Questions about this Privacy Policy or the Terms of Use can be sent through the contact page linked in the footer, or directly to info@sensical.es.",
  },
] as const;

export function TermsPage(): ReactElement {
  const { formatMessage } = useIntl();

  return (
    <div className="flex min-h-svh flex-col bg-background-full">
      <LandingHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 pb-12 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-1-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.terms.title", defaultMessage: "Terms and Conditions" })}
          </h1>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({ id: "page.terms.lastUpdated", defaultMessage: "Last updated 2026-09-21." })}
          </p>
        </div>

        <nav aria-label={formatMessage({ id: "page.terms.toc.heading", defaultMessage: "Contents" })}>
          <p className="text-caption-1-medium uppercase tracking-[0.12em] text-text-tertiary">
            {formatMessage({ id: "page.terms.toc.heading", defaultMessage: "Contents" })}
          </p>
          <ol className="mt-3 flex flex-col gap-1">
            <li>
              <a href="#terms-of-use" className="text-body-regular text-accent-500 underline underline-offset-2">
                {formatMessage({ id: "page.terms.tou.heading", defaultMessage: "Terms of Use" })}
              </a>
              <ol className="ml-5 mt-1 flex flex-col gap-1">
                {termsOfUse.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-caption-1-regular text-text-tertiary underline underline-offset-2 hover:text-text-secondary"
                    >
                      {formatMessage({ id: section.headingId, defaultMessage: section.headingDefault })}
                    </a>
                  </li>
                ))}
              </ol>
            </li>
            <li className="mt-2">
              <a href="#privacy-policy" className="text-body-regular text-accent-500 underline underline-offset-2">
                {formatMessage({ id: "page.terms.privacy.heading", defaultMessage: "Privacy Policy" })}
              </a>
              <ol className="ml-5 mt-1 flex flex-col gap-1">
                {privacyPolicy.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-caption-1-regular text-text-tertiary underline underline-offset-2 hover:text-text-secondary"
                    >
                      {formatMessage({ id: section.headingId, defaultMessage: section.headingDefault })}
                    </a>
                  </li>
                ))}
              </ol>
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-6">
          <h2 id="terms-of-use" className="text-title-2-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.terms.tou.heading", defaultMessage: "Terms of Use" })}
          </h2>
          {termsOfUse.map((section) => (
            <section key={section.id} id={section.id} className="flex flex-col gap-2 scroll-mt-20">
              <h3 className="text-title-3-medium text-text-primary">
                {formatMessage({ id: section.headingId, defaultMessage: section.headingDefault })}
              </h3>
              <p className="text-body-regular text-text-secondary">
                {formatMessage({ id: section.bodyId, defaultMessage: section.bodyDefault })}
              </p>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 id="privacy-policy" className="text-title-2-medium tracking-tight text-text-primary scroll-mt-20">
              {formatMessage({ id: "page.terms.privacy.heading", defaultMessage: "Privacy Policy" })}
            </h2>
            <p className="text-body-regular text-text-secondary">
              {formatMessage({
                id: "page.terms.privacy.intro",
                defaultMessage:
                  "This Privacy Policy explains what personal data Mesh Things collects about you and why. Read it together with the Terms of Use above.",
              })}
            </p>
          </div>
          {privacyPolicy.map((section) => (
            <section key={section.id} id={section.id} className="flex flex-col gap-2 scroll-mt-20">
              <h3 className="text-title-3-medium text-text-primary">
                {formatMessage({ id: section.headingId, defaultMessage: section.headingDefault })}
              </h3>
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
