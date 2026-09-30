import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Link } from "@tanstack/react-router";
import { routes } from "@/router";
import { LandingFooter } from "@/pages/home/footer";
import { SiteHeader } from "@/components/site-header";

const termsOfUse = [
  {
    id: "relationship",
    headingId: "page.terms.tou.relationship.heading",
    headingDefault: "1. Your relationship with Sensical",
    bodyId: "page.terms.tou.relationship.body",
    bodyDefault:
      "Your use of the Mesh Things website and console (the \"Platform\") is governed by a legal agreement between you and Sensical SCCL, CIF ESF27637909, a cooperative with its registered office at Diputació 151, 08011 Barcelona, Spain (\"Sensical\"). These Terms of Use, the Privacy Policy and the Data Processing Agreement below together make up the \"Terms\".",
  },
  {
    id: "accepting",
    headingId: "page.terms.tou.accepting.heading",
    headingDefault: "2. Accepting these Terms",
    bodyId: "page.terms.tou.accepting.body",
    bodyDefault:
      "These Terms apply to anyone who uses the Platform. You accept them when you create an owner account, and each mesh, source or sink you create asks you to accept its own data terms, which include the Data Processing Agreement. Browsing the public pages doesn't require an account. If you don't agree with these Terms, don't create an account.",
  },
  {
    id: "changes-terms",
    headingId: "page.terms.tou.changesTerms.heading",
    headingDefault: "3. Changes to these Terms",
    bodyId: "page.terms.tou.changesTerms.body",
    bodyDefault:
      "Sensical may update these Terms as the Platform evolves, for example to reflect new features or legal requirements. Sensical will email you at least 30 days before a change takes effect and ask you to accept the new version, and records that acceptance. If you don't accept it, you can export your data and delete your account. Changes required by law or to fix a security issue may take effect sooner, and Sensical will tell you why.",
  },
  {
    id: "platform",
    headingId: "page.terms.tou.platform.heading",
    headingDefault: "4. The Mesh Things Platform",
    bodyId: "page.terms.tou.platform.body",
    bodyDefault:
      "Mesh Things is a storage and console layer for Meshtastic networks: it lets you register meshes and devices, ingest telemetry, and configure alarms and blueprints through the console. Sensical doesn't manufacture or sell hardware — you're responsible for the Meshtastic devices and networks you connect to it. api.sensical.es and things.sensical.es are a demo instance of Mesh Things.",
  },
  {
    id: "account",
    headingId: "page.terms.tou.account.heading",
    headingDefault: "5. Creating an owner account",
    bodyId: "page.terms.tou.account.body",
    bodyDefault:
      "To use the console you need to create an owner account with a name, email address and password. A new account stays inactive until you confirm your email address, and you're responsible for keeping your password and API keys confidential and for all activity under your account. If you suspect unauthorized use of your account, change your password immediately and notify Sensical at info@sensical.es.",
  },
  {
    id: "using-platform",
    headingId: "page.terms.tou.usingPlatform.heading",
    headingDefault: "6. Using the Platform and registering mesh data",
    bodyId: "page.terms.tou.usingPlatform.body",
    bodyDefault:
      "If you register meshes, devices or telemetry under your account, you're responsible for the accuracy and legality of that data and for the devices you connect. For the personal data in that traffic, and in what you forward through sinks, you act as controller, as set out in the Data Processing Agreement. Sensical doesn't screen or verify device data before storing it, and storing it doesn't make Sensical liable for its content or accuracy.",
  },
  {
    id: "accessing-data",
    headingId: "page.terms.tou.accessingData.heading",
    headingDefault: "7. Accessing mesh and device data",
    bodyId: "page.terms.tou.accessingData.body",
    bodyDefault:
      "Meshes and devices you register are private to your account unless you choose otherwise: only you and the accounts you give access to can read their configuration and telemetry. If you make a mesh public, every signed-in account can read its devices and telemetry, including positions, but can't see its channel key or change anything. Visitors who aren't signed in can't. If you're an operator, you can also forward readings and alarms to sinks you create, and whoever holds a sink's credentials receives them. Sensical's administrators can access every mesh, only to operate, support and secure the service. Sensical doesn't sell your mesh data or share it with anyone beyond the sub-processors listed in the Data Processing Agreement and the recipients of the sinks you create.",
  },
  {
    id: "platform-changes",
    headingId: "page.terms.tou.platformChanges.heading",
    headingDefault: "8. Changes to the Platform",
    bodyId: "page.terms.tou.platformChanges.body",
    bodyDefault:
      "Sensical may add or improve features at any time. It will email you at least 30 days before it removes a feature you use or tightens limits on storage, request rates or API usage, unless a change is needed sooner for security or legal reasons. If a change affects data already stored, you'll be able to export it before the change takes effect.",
  },
  {
    id: "termination",
    headingId: "page.terms.tou.termination.heading",
    headingDefault: "9. Termination",
    bodyId: "page.terms.tou.termination.body",
    bodyDefault:
      "You may delete your account at any time from the console profile page. Your account and its access are removed at once. The data of your meshes and sources is deleted 30 days later and removed from backups within a further 7 days, so export anything you want to keep first. Sensical keeps a record of the terms you accepted and the archive and sink instructions you gave, with your name and email address, for 5 years after your account is deleted, to show that it processed data as you instructed. Sensical may suspend or close accounts that violate these Terms or otherwise abuse the service, and will try to notify you by email beforehand where practical; the same deletion periods then apply.",
  },
  {
    id: "third-party",
    headingId: "page.terms.tou.thirdParty.heading",
    headingDefault: "10. Third-party sites and sub-processors",
    bodyId: "page.terms.tou.thirdParty.body",
    bodyDefault:
      "The Platform may link to third-party sites. Sensical isn't responsible for the content, availability or practices of sites it doesn't control. The providers Sensical uses to run the Platform, such as its hosting provider, are sub-processors, listed in the Data Processing Agreement, and Sensical remains responsible to you for them.",
  },
  {
    id: "high-risk",
    headingId: "page.terms.tou.highRisk.heading",
    headingDefault: "11. High-risk uses",
    bodyId: "page.terms.tou.highRisk.body",
    bodyDefault:
      "The Platform is not designed, tested or intended for use in situations where a failure or delay in telemetry could cause death, personal injury, or severe property or environmental damage. Don't rely on it as the sole safeguard for such uses.",
  },
  {
    id: "indemnity",
    headingId: "page.terms.tou.indemnity.heading",
    headingDefault: "12. Indemnity",
    bodyId: "page.terms.tou.indemnity.body",
    bodyDefault:
      "You agree to hold Sensical harmless from claims arising out of your misuse of the Platform or a violation of these Terms, including claims related to data you register or content you upload.",
  },
  {
    id: "liability",
    headingId: "page.terms.tou.liability.heading",
    headingDefault: "13. Limitation of liability",
    bodyId: "page.terms.tou.liability.body",
    bodyDefault:
      "Sensical provides the Platform with reasonable care and skill, but doesn't guarantee that it will be uninterrupted or error-free, or that no data will ever be lost; keep your own copies of data that matters to you. To the extent the law allows, Sensical isn't liable for indirect or consequential loss, such as lost profits or opportunities, and its total liability to you in any 12 months is limited to what you paid Sensical for the Platform in that period, or €100 if that is more. These limits don't apply to liability for intent or gross negligence, for death or personal injury, to your rights as a consumer, or to either party's liability to data subjects under Article 82 GDPR.",
  },
  {
    id: "governing-law",
    headingId: "page.terms.tou.governingLaw.heading",
    headingDefault: "14. Governing law",
    bodyId: "page.terms.tou.governingLaw.body",
    bodyDefault:
      "These Terms are governed by Spanish law. Disputes arising from them will be handled by the courts of Barcelona, Spain, except where mandatory consumer-protection rules require otherwise.",
  },
] as const;

const privacyPolicy = [
  {
    id: "purpose",
    headingId: "page.terms.privacy.purpose.heading",
    headingDefault: "1. Purpose of this Privacy Policy",
    bodyId: "page.terms.privacy.purpose.body",
    bodyDefault:
      "This Privacy Policy covers the personal data Sensical processes as controller when you use the Platform: your account and how you use it. The data of the meshes, sources and sinks you set up is processed by Sensical on your behalf, as your processor, under the Data Processing Agreement rather than this policy. Terms defined in the Terms of Use above have the same meaning here.",
  },
  {
    id: "changes-privacy",
    headingId: "page.terms.privacy.changesPrivacy.heading",
    headingDefault: "2. Changes to this Privacy Policy",
    bodyId: "page.terms.privacy.changesPrivacy.body",
    bodyDefault:
      "Sensical may update this Privacy Policy as the Platform evolves. It will email you at least 30 days before a material change takes effect, and the current version, with its effective date, is always on this page. If you disagree with a change, you can close your account before it takes effect.",
  },
  {
    id: "data-processed",
    headingId: "page.terms.privacy.dataProcessed.heading",
    headingDefault: "3. Personal data Sensical processes",
    bodyId: "page.terms.privacy.dataProcessed.body",
    bodyDefault:
      "Your name and email address; your password, stored only as a salted hash; your settings; your API keys, stored only as hashes; a session cookie while you're signed in; a record of each set of terms you accept, with its version, the time and your name and email address; the archive and sink instructions you give, with the same details; and what you write to Sensical when you ask for support. Your name, email address and password are needed to create an account; without them Sensical can't provide one.",
  },
  {
    id: "processing-purposes",
    headingId: "page.terms.privacy.processingPurposes.heading",
    headingDefault: "4. Purposes and legal bases",
    bodyId: "page.terms.privacy.processingPurposes.body",
    bodyDefault:
      "Sensical uses your account data to create and maintain your account, run the console and send service emails, such as verification, password reset, alarms and terms renewal notices, because this is necessary to provide the Platform you signed up for (Article 6(1)(b) GDPR). It keeps the records of terms accepted and instructions given to show that it complies with data protection law and to defend itself against claims (Article 6(1)(c) and (f)). It uses technical data, such as your IP address, to secure the service and prevent abuse, for example by limiting sign-in attempts, based on its legitimate interest in keeping the Platform safe (Article 6(1)(f)). Sensical makes no automated decisions about you. The marketing site sets no analytics cookies, and the console only sets a session cookie once you sign in, so the API knows who you are.",
  },
  {
    id: "data-sharing",
    headingId: "page.terms.privacy.dataSharing.heading",
    headingDefault: "5. Who receives your data",
    bodyId: "page.terms.privacy.dataSharing.body",
    bodyDefault:
      "Sensical doesn't sell or rent your personal data. Its hosting provider, Hetzner (Germany and Finland), and its email provider, Scaleway (France), process it on Sensical's behalf. Other signed-in accounts can see your name, in the owner directory and on the meshes you make public or share with them. Otherwise Sensical only shares your data when you've asked it to, when needed to investigate abuse or enforce these Terms, or when required by law.",
  },
  {
    id: "retention",
    headingId: "page.terms.privacy.retention.heading",
    headingDefault: "6. How long Sensical keeps your data",
    bodyId: "page.terms.privacy.retention.body",
    bodyDefault:
      "Your account data is kept while your account exists. When you delete your account, it is removed at once, and from backups within 7 days. The records of terms you accepted and instructions you gave are kept for 5 years after your account is deleted, the period in which claims can usually be brought, and then deleted. Support emails are kept for as long as needed to answer you and follow up. Technical logs, which can include your IP address, are deleted after 30 days.",
  },
  {
    id: "data-storage",
    headingId: "page.terms.privacy.dataStorage.heading",
    headingDefault: "7. Where your data is stored",
    bodyId: "page.terms.privacy.dataStorage.body",
    bodyDefault:
      "Sensical stores your data on servers in the European Union and doesn't transfer it outside the European Economic Area. When you view a map, though, your browser loads map tiles and map code directly from CARTO, OpenFreeMap and unpkg. Those services receive your IP address and may serve the request from outside the European Union, under their own privacy policies.",
  },
  {
    id: "security",
    headingId: "page.terms.privacy.security.heading",
    headingDefault: "8. Security of your data",
    bodyId: "page.terms.privacy.security.body",
    bodyDefault:
      "Sensical takes reasonable steps to protect your data, including transport encryption and access controls, but no transmission over the internet is completely secure. If Sensical becomes aware of a security breach affecting your data, it will notify you by email or through a notice on the Platform.",
  },
  {
    id: "your-rights",
    headingId: "page.terms.privacy.yourRights.heading",
    headingDefault: "9. Your rights",
    bodyId: "page.terms.privacy.yourRights.body",
    bodyDefault:
      "You have the right to access your personal data, to have it corrected or erased, to restrict or object to its processing, and to receive it in a portable format. You can see and correct your details, and delete your account, from the console profile page. For anything else, write to info@sensical.es; Sensical answers within one month. If you think Sensical hasn't respected your rights, you can complain to the Spanish Data Protection Agency (AEPD, www.aepd.es).",
  },
  {
    id: "your-node",
    headingId: "page.terms.privacy.yourNode.heading",
    headingDefault: "10. If your node appears on Mesh Things",
    bodyId: "page.terms.privacy.yourNode.body",
    bodyDefault:
      "Mesh Things stores data from the Meshtastic nodes that reach the meshes and sources its users set up, which can include nodes of people who have no account here. For that data, the owner of the mesh or source is the controller and decides what is collected and why; Sensical processes it only on their behalf. If you think data from your node is stored here, write to info@sensical.es with your node's ID. Sensical will pass your request to the owner concerned and help them answer it.",
  },
  {
    id: "other-sites",
    headingId: "page.terms.privacy.otherSites.heading",
    headingDefault: "11. Other websites and applications",
    bodyId: "page.terms.privacy.otherSites.body",
    bodyDefault:
      "The Platform may link to other websites. Sensical isn't responsible for their privacy practices — review their own policies before sharing information with them.",
  },
  {
    id: "data-controller",
    headingId: "page.terms.privacy.dataController.heading",
    headingDefault: "12. Data controller and contact",
    bodyId: "page.terms.privacy.dataController.body",
    bodyDefault:
      "The data controller for the personal data described above is Sensical SCCL, CIF ESF27637909, Diputació 151, 08011 Barcelona, Spain. Questions about this Privacy Policy or the Terms of Use can be sent through the contact page linked in the footer, or directly to info@sensical.es.",
  },
] as const;

export function TermsPage(): ReactElement {
  const { formatMessage } = useIntl();

  return (
    <div className="flex min-h-svh flex-col bg-background-full">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 pb-12 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-1-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.terms.title", defaultMessage: "Terms and Conditions" })}
          </h1>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({ id: "page.terms.lastUpdated", defaultMessage: "Last updated 2026-09-30." })}
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
            <li className="mt-2">
              <a href="#data-processing" className="text-body-regular text-accent-500 underline underline-offset-2">
                {formatMessage({ id: "page.terms.dpa.heading", defaultMessage: "Data Processing Agreement" })}
              </a>
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

        <section id="data-processing" className="flex flex-col gap-2 scroll-mt-20">
          <h2 className="text-title-2-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.terms.dpa.heading", defaultMessage: "Data Processing Agreement" })}
          </h2>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.terms.dpa.body",
              defaultMessage:
                "For the mesh, source and sink data you bring into the Platform, you are the controller and Sensical processes it only on your behalf. The Data Processing Agreement sets out how, under Article 28 GDPR, together with its annexes on the processing, the security measures and the sub-processors. It forms part of these Terms, and you accept it when you accept a mesh's, a source's or a sink's terms.",
            })}
          </p>
          <p>
            <Link to={routes.dpa} className="text-body-regular text-accent-500 underline underline-offset-2">
              {formatMessage({ id: "page.terms.dpa.link", defaultMessage: "Read the Data Processing Agreement" })}
            </Link>
          </p>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
