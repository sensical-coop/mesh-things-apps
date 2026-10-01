import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { LandingFooter } from "@/pages/home/footer";
import { SiteHeader } from "@/components/site-header";

type Message = { id: string; defaultMessage: string };
type Section = { id: string; heading: Message; paragraphs: Message[] };
type AnnexGroup = Section & { items: Message[] };
type SubProcessor = { id: string; name: string; service: Message; location: Message };

/**
 * The Art. 28 DPA that the mesh and source terms incorporate. Sections 1 to 13 change only
 * with a new version of those terms; the annexes can change under sections 6 and 8.
 */
const sections: Section[] = [
  {
    id: "subject",
    heading: { id: "page.dpa.subject.heading", defaultMessage: "1. Subject matter and duration" },
    paragraphs: [
      { id: "page.dpa.subject.p1", defaultMessage: "Sensical processes personal data on your behalf only to provide the Mesh Things service for the meshes, sources and sinks you set up: to receive, decrypt, decode, store, display, export and delete the traffic your meshes and sources bring in, and to forward it to the sinks you create, as described in Annex I." },
      { id: "page.dpa.subject.p2", defaultMessage: "This DPA applies while you have a mesh, a source or a sink whose terms you accepted, and afterwards for as long as Sensical still holds its data under section 11. It ends with the Terms of Use. Your statutory rights are unaffected." },
    ],
  },
  {
    id: "roles",
    heading: { id: "page.dpa.roles.heading", defaultMessage: "2. Roles" },
    paragraphs: [
      { id: "page.dpa.roles.p1", defaultMessage: "For the data described in Annex I you are the controller and Sensical is the processor. You are responsible for the lawfulness of the processing, including having a lawful basis and informing the people whose nodes appear on your mesh, as you confirm when you accept the mesh or source terms." },
      { id: "page.dpa.roles.p2", defaultMessage: "For your own account data (name, email address and password), Sensical is the controller, and the Privacy Policy covers that data." },
    ],
  },
  {
    id: "instructions",
    heading: { id: "page.dpa.instructions.heading", defaultMessage: "3. Your instructions" },
    paragraphs: [
      { id: "page.dpa.instructions.p1", defaultMessage: "Sensical processes the data only on your documented instructions, unless EU or Member State law requires otherwise. In that case Sensical tells you first, unless that law forbids it." },
      { id: "page.dpa.instructions.p2", defaultMessage: "Your instructions are this DPA and what you configure in the service: the gateways and sources you register, the devices you archive, the sinks you create and the meshes and devices you attach to them, the alarms and blueprints you set, whether a mesh is public, and the accounts you give access to. Sensical records who turned archiving on or off for each device and who attached or detached each mesh and device from a sink, and when." },
      { id: "page.dpa.instructions.sinks", defaultMessage: "When you attach meshes or devices to a sink, Sensical publishes their readings, derived metrics and alarms, in the streams you choose, on its own broker, where whoever holds that sink's credentials can subscribe to them. The recipients of a sink are yours, not Sensical's sub-processors: you choose them and give them the credentials, and you are responsible for their use of the data, including any transfer outside the European Economic Area. A sink keeps data only for 24h to provide a session backup in case of disconnect, but beyond 24h, it doesn't keep any data of its own. Deleting it or detaching its meshes and devices stops the forwarding." },
      { id: "page.dpa.instructions.p3", defaultMessage: "You can give further instructions by email to info@sensical.es. If Sensical believes an instruction breaks data protection law, it will tell you and may suspend it until you confirm or change it." },
    ],
  },
  {
    id: "location",
    heading: { id: "page.dpa.location.heading", defaultMessage: "4. Location and transfers" },
    paragraphs: [
      { id: "page.dpa.location.p1", defaultMessage: "Sensical processes and stores the data only in the European Union or the European Economic Area. A transfer outside it requires your prior authorisation through the procedure in section 8, and takes place only with a safeguard under Chapter V GDPR, such as an adequacy decision or the EU standard contractual clauses." },
    ],
  },
  {
    id: "confidentiality",
    heading: { id: "page.dpa.confidentiality.heading", defaultMessage: "5. Confidentiality" },
    paragraphs: [
      { id: "page.dpa.confidentiality.p1", defaultMessage: "Only people who need access to run the service can access the data. They are bound by confidentiality, which continues after their work for Sensical ends. Sensical's administrators access mesh data only to operate, support and secure the service." },
    ],
  },
  {
    id: "security",
    heading: { id: "page.dpa.security.heading", defaultMessage: "6. Security" },
    paragraphs: [
      { id: "page.dpa.security.p1", defaultMessage: "Sensical implements the technical and organisational measures in Annex II, appropriate to the risk as required by Article 32 GDPR." },
      { id: "page.dpa.security.p2", defaultMessage: "The measures follow technical progress. Sensical may change them as long as the overall level of protection does not fall, and publishes the current Annex II on this page. Such a change does not require you to accept this DPA again." },
    ],
  },
  {
    id: "assistance",
    heading: { id: "page.dpa.assistance.heading", defaultMessage: "7. Assistance" },
    paragraphs: [
      { id: "page.dpa.assistance.p1", defaultMessage: "Taking into account the nature of the processing, Sensical helps you answer requests from data subjects to exercise their rights, mainly through the service itself: you can view, export and delete your meshes' data. If a data subject contacts Sensical directly about your mesh, Sensical forwards the request to you without undue delay and does not answer it on your behalf unless you ask." },
      { id: "page.dpa.assistance.p2", defaultMessage: "With the information available to it, Sensical also helps you with security, breach notification, data protection impact assessments and prior consultation of a supervisory authority (Articles 32 to 36 GDPR)." },
    ],
  },
  {
    id: "subprocessors",
    heading: { id: "page.dpa.subprocessors.heading", defaultMessage: "8. Sub-processors" },
    paragraphs: [
      { id: "page.dpa.subprocessors.p1", defaultMessage: "You give Sensical general authorisation to engage sub-processors. The current ones are listed in Annex III. Sensical binds each of them by contract to data protection obligations equivalent to this DPA and remains fully liable to you for their performance." },
      { id: "page.dpa.subprocessors.p2", defaultMessage: "Sensical tells you by email, and on this page, at least 30 days before adding or replacing a sub-processor. You may object on reasonable data protection grounds within that period. If the objection can't be resolved, you can end the processing before the change takes effect by deleting the affected meshes and sources, or your account." },
    ],
  },
  {
    id: "breaches",
    heading: { id: "page.dpa.breaches.heading", defaultMessage: "9. Personal data breaches" },
    paragraphs: [
      { id: "page.dpa.breaches.p1", defaultMessage: "Sensical notifies you without undue delay, and in any case within 48 hours, after becoming aware of a personal data breach affecting your data. The notice describes, as far as known, the nature of the breach, the categories and approximate number of data subjects and records concerned, its likely consequences, the measures taken or proposed, and a contact point. Sensical adds information as it becomes available." },
    ],
  },
  {
    id: "audits",
    heading: { id: "page.dpa.audits.heading", defaultMessage: "10. Information and audits" },
    paragraphs: [
      { id: "page.dpa.audits.p1", defaultMessage: "Sensical makes available the information needed to demonstrate compliance with Article 28 GDPR, including this DPA, Annex II and its hosting provider's certifications. You may audit Sensical yourself or through an independent auditor bound by confidentiality, once a year, with 30 days' notice, during business hours and without disrupting the service. Each party bears its own costs, unless the audit reveals a material breach of this DPA by Sensical." },
    ],
  },
  {
    id: "deletion",
    heading: { id: "page.dpa.deletion.heading", defaultMessage: "11. Deletion and return" },
    paragraphs: [
      { id: "page.dpa.deletion.p1", defaultMessage: "You can export your meshes' data at any time, including the Parquet archive of archived devices or via the API. When you delete a mesh or a source, when its terms lapse without renewal, or when you delete your account, Sensical deletes the related data after the grace period stated in those terms, unless you renew in the meantime or EU or Member State law requires it to be kept." },
      { id: "page.dpa.deletion.p2", defaultMessage: "Backups are overwritten on rotation, within 7 days of the data being deleted from the service. Sensical keeps the records needed to prove proper processing, such as terms acceptances and archive and sink instructions, for 5 years after your account is deleted, and uses them for no other purpose." },
    ],
  },
  {
    id: "liability",
    heading: { id: "page.dpa.liability.heading", defaultMessage: "12. Liability" },
    paragraphs: [
      { id: "page.dpa.liability.p1", defaultMessage: "Each party's liability under this DPA follows the Terms of Use. Nothing in this DPA limits either party's liability to data subjects under Article 82 GDPR." },
    ],
  },
  {
    id: "changes",
    heading: { id: "page.dpa.changes.heading", defaultMessage: "13. Changes and other terms" },
    paragraphs: [
      { id: "page.dpa.changes.p1", defaultMessage: "Sensical may update this DPA to reflect changes in the law or the service. Changes to sections 1 to 13 are announced by email at least 30 days before they take effect, and you accept them by renewing your mesh and source terms. Changes to the annexes follow sections 6 and 8. Each version is dated, and earlier versions are available on request." },
      { id: "page.dpa.changes.p2", defaultMessage: "On data protection, this DPA prevails over the Terms of Use. It is governed by Spanish law and the courts of Barcelona have jurisdiction, except where mandatory law provides otherwise. Should any provision be invalid, the rest remain in force." },
    ],
  },
];

const processingDetails: AnnexGroup[] = [
  {
    id: "annex1-purpose",
    heading: { id: "page.dpa.annex1.purpose.heading", defaultMessage: "Subject matter and purpose" },
    paragraphs: [
      { id: "page.dpa.annex1.purpose.p1", defaultMessage: "Providing Mesh Things for your meshes, sources and sinks: receiving traffic from your gateways on the default broker or from the brokers your sources bridge, decrypting it with the keys you provide, decoding and storing it, showing it in the console and the API, computing blueprints and alarms, emailing alarms, archiving the devices you choose, forwarding readings and alarms to the sinks you create, and exporting and deleting it." },
    ],
    items: [],
  },
  {
    id: "annex1-nature",
    heading: { id: "page.dpa.annex1.nature.heading", defaultMessage: "Nature of the processing" },
    paragraphs: [
      { id: "page.dpa.annex1.nature.p1", defaultMessage: "Collection, decryption, decoding, storage, structuring, consultation, disclosure to the accounts you authorise and to the recipients of your sinks, transmission by email, export and erasure. The processing is automated and takes no decisions about individuals." },
    ],
    items: [],
  },
  {
    id: "annex1-data",
    heading: { id: "page.dpa.annex1.data.heading", defaultMessage: "Categories of personal data" },
    paragraphs: [],
    items: [
      { id: "page.dpa.annex1.data.li1", defaultMessage: "Device identifiers: node numbers, long and short names, hardware model and gateway IDs." },
      { id: "page.dpa.annex1.data.li2", defaultMessage: "Location data: positions reported by nodes, with their precision and time." },
      { id: "page.dpa.annex1.data.li3", defaultMessage: "Telemetry: device metrics, such as battery and channel use, and sensor readings, such as environment, air quality and power." },
      { id: "page.dpa.annex1.data.li4", defaultMessage: "Data derived from the above: data processing results for calibration and correction purposes, alarms and data quality events." },
    ],
  },
  {
    id: "annex1-subjects",
    heading: { id: "page.dpa.annex1.subjects.heading", defaultMessage: "Data subjects" },
    paragraphs: [],
    items: [
      { id: "page.dpa.annex1.subjects.li1", defaultMessage: "People who own or operate nodes whose traffic reaches your mesh or source, including people with no Mesh Things account." },
      { id: "page.dpa.annex1.subjects.li2", defaultMessage: "You and the people you give access to your meshes, where the service records their actions." },
    ],
  },
  {
    id: "annex1-special",
    heading: { id: "page.dpa.annex1.special.heading", defaultMessage: "Special categories" },
    paragraphs: [
      { id: "page.dpa.annex1.special.p1", defaultMessage: "None intended. You undertake not to use the service to collect special categories of data or to track or profile individuals." },
    ],
    items: [],
  },
  {
    id: "annex1-duration",
    heading: { id: "page.dpa.annex1.duration.heading", defaultMessage: "Duration" },
    paragraphs: [
      { id: "page.dpa.annex1.duration.p1", defaultMessage: "While the mesh, source or sink is in use and its terms are valid, plus the deletion grace period and backup rotation in section 11." },
    ],
    items: [],
  },
];

const securityMeasures: AnnexGroup[] = [
  {
    id: "annex2-hosting",
    heading: { id: "page.dpa.annex2.hosting.heading", defaultMessage: "Hosting and physical security" },
    paragraphs: [],
    items: [
      { id: "page.dpa.annex2.hosting.li1", defaultMessage: "Servers run in Hetzner data centres in the EU, with physical access control, video surveillance, redundant power and cooling, and fire protection, certified under ISO/IEC 27001." },
    ],
  },
  {
    id: "annex2-network",
    heading: { id: "page.dpa.annex2.network.heading", defaultMessage: "Network and servers" },
    paragraphs: [],
    items: [
      { id: "page.dpa.annex2.network.li1", defaultMessage: "A host firewall exposes only SSH and the service's public endpoints. Databases, message queues and internal services are not reachable from the internet." },
      { id: "page.dpa.annex2.network.li2", defaultMessage: "SSH accepts keys only, with no root login, and repeated failed attempts are blocked." },
      { id: "page.dpa.annex2.network.li3", defaultMessage: "All public endpoints use TLS. Administration interfaces sit behind password authentication at the proxy." },
      { id: "page.dpa.annex2.network.li4", defaultMessage: "Security updates are applied automatically." },
      { id: "page.dpa.annex2.network.li5", defaultMessage: "Access to the hosting provider's console requires two-factor authentication." },
    ],
  },
  {
    id: "annex2-access",
    heading: { id: "page.dpa.annex2.access.heading", defaultMessage: "Access control in the service" },
    paragraphs: [],
    items: [
      { id: "page.dpa.annex2.access.li1", defaultMessage: "Passwords and API keys are stored only as hashes. New accounts must confirm their email address, and sign-in and sign-up are rate-limited." },
      { id: "page.dpa.annex2.access.li2", defaultMessage: "Role-based permissions (owner, operator, administrator) decide who can read and change each mesh. Meshes are private unless their owner makes them public." },
      { id: "page.dpa.annex2.access.li3", defaultMessage: "Channel and admin keys are returned only to the mesh's owner." },
      { id: "page.dpa.annex2.access.li4", defaultMessage: "The Parquet archive is read with temporary credentials limited to one mesh." },
      { id: "page.dpa.annex2.access.li5", defaultMessage: "Each sink has its own credentials, generated by Sensical, that can only subscribe to that sink's readings. When a sink's terms lapse, it is paused and its credentials are refused." },
    ],
  },
  {
    id: "annex2-separation",
    heading: { id: "page.dpa.annex2.separation.heading", defaultMessage: "Separation and minimisation" },
    paragraphs: [],
    items: [
      { id: "page.dpa.annex2.separation.li1", defaultMessage: "Readings are tagged and partitioned by mesh, and every query is scoped to what the caller may see." },
      { id: "page.dpa.annex2.separation.li2", defaultMessage: "Only traffic from registered gateways and sources is stored. Archiving is off by default and enabled per device." },
      { id: "page.dpa.annex2.separation.li3", defaultMessage: "When terms lapse, ingestion stops before anything is deleted, and deletions are scheduled, retried and logged. In-flight messages are kept for at most 7 days." },
      { id: "page.dpa.annex2.separation.li4", defaultMessage: "Service logs, which can include IP addresses, are deleted after 30 days." },
    ],
  },
  {
    id: "annex2-availability",
    heading: { id: "page.dpa.annex2.availability.heading", defaultMessage: "Availability and recovery" },
    paragraphs: [],
    items: [
      { id: "page.dpa.annex2.availability.li1", defaultMessage: "Servers are backed up daily with Hetzner's backup service, which keeps the last 7 backups in Hetzner's EU data centres." },
    ],
  },
  {
    id: "annex2-organisation",
    heading: { id: "page.dpa.annex2.organisation.heading", defaultMessage: "Organisation" },
    paragraphs: [],
    items: [
      { id: "page.dpa.annex2.organisation.li1", defaultMessage: "Access to the production deployment is limited to the Sensical staff who run the service, bound by confidentiality." },
      { id: "page.dpa.annex2.organisation.li2", defaultMessage: "Terms acceptances and archive and sink instructions are recorded with who gave them and when." },
      { id: "page.dpa.annex2.organisation.li3", defaultMessage: "Breaches are handled under a documented incident procedure that meets section 9, and every breach is recorded. These measures are reviewed at least once a year and whenever the service changes significantly." },
    ],
  },
];

const subProcessors: SubProcessor[] = [
  {
    id: "hetzner",
    name: "Hetzner Online GmbH",
    service: { id: "page.dpa.annex3.hetzner.service", defaultMessage: "Server hosting and storage" },
    location: { id: "page.dpa.annex3.hetzner.location", defaultMessage: "Germany" },
  },
  {
    id: "hetznerFinland",
    name: "Hetzner Finland Oy",
    service: { id: "page.dpa.annex3.hetznerFinland.service", defaultMessage: "Data centre operation, only for servers in Helsinki" },
    location: { id: "page.dpa.annex3.hetznerFinland.location", defaultMessage: "Finland" },
  },
  {
    id: "scaleway",
    name: "Scaleway SAS",
    service: { id: "page.dpa.annex3.scaleway.service", defaultMessage: "Account and alarm emails" },
    location: { id: "page.dpa.annex3.scaleway.location", defaultMessage: "France" },
  },
];

const tocLinkClass =
  "text-caption-1-regular text-text-tertiary underline underline-offset-2 hover:text-text-secondary";
const tocHeadingClass = "text-body-regular text-accent-500 underline underline-offset-2";

export function DpaPage(): ReactElement {
  const { formatMessage } = useIntl();
  const annexes = [
    { id: "annex-1", heading: formatMessage({ id: "page.dpa.annex1.heading", defaultMessage: "Annex I. Details of the processing" }), groups: processingDetails },
    { id: "annex-2", heading: formatMessage({ id: "page.dpa.annex2.heading", defaultMessage: "Annex II. Technical and organisational measures" }), groups: securityMeasures },
  ];
  const subProcessorsHeading = formatMessage({ id: "page.dpa.annex3.heading", defaultMessage: "Annex III. Sub-processors" });

  return (
    <div className="flex min-h-svh flex-col bg-background-full">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 pb-12 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-1-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.dpa.title", defaultMessage: "Data Processing Agreement" })}
          </h1>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({ id: "page.dpa.lastUpdated", defaultMessage: "Version 1.0. Last updated 2026-09-30." })}
          </p>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.dpa.intro",
              defaultMessage:
                'This Data Processing Agreement ("DPA") forms part of the Mesh Things Terms of Use. It is agreed between Sensical SCCL, CIF ESF27637909, Diputació 151, 08011 Barcelona, Spain ("Sensical"), as processor, and each owner who accepts the terms of a mesh, a source or a sink ("you"), as controller, under Article 28 of the General Data Protection Regulation (EU) 2016/679 ("GDPR"). You accept it when you accept a mesh\'s, a source\'s or a sink\'s terms, and the version you accepted is recorded with that acceptance.',
            })}
          </p>
        </div>

        <nav aria-label={formatMessage({ id: "page.dpa.toc.heading", defaultMessage: "Contents" })}>
          <p className="text-caption-1-medium uppercase tracking-[0.12em] text-text-tertiary">
            {formatMessage({ id: "page.dpa.toc.heading", defaultMessage: "Contents" })}
          </p>
          <ol className="mt-3 flex flex-col gap-1">
            <li>
              <a href="#agreement" className={tocHeadingClass}>
                {formatMessage({ id: "page.dpa.agreement.heading", defaultMessage: "Agreement" })}
              </a>
              <ol className="ml-5 mt-1 flex flex-col gap-1">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className={tocLinkClass}>
                      {formatMessage(section.heading)}
                    </a>
                  </li>
                ))}
              </ol>
            </li>
            <li className="mt-2">
              <a href="#annexes" className={tocHeadingClass}>
                {formatMessage({ id: "page.dpa.annexes.heading", defaultMessage: "Annexes" })}
              </a>
              <ol className="ml-5 mt-1 flex flex-col gap-1">
                {annexes.map((annex) => (
                  <li key={annex.id}>
                    <a href={`#${annex.id}`} className={tocLinkClass}>
                      {annex.heading}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="#annex-3" className={tocLinkClass}>
                    {subProcessorsHeading}
                  </a>
                </li>
              </ol>
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-6">
          <h2 id="agreement" className="text-title-2-medium tracking-tight text-text-primary scroll-mt-20">
            {formatMessage({ id: "page.dpa.agreement.heading", defaultMessage: "Agreement" })}
          </h2>
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="flex flex-col gap-2 scroll-mt-20">
              <h3 className="text-title-3-medium text-text-primary">{formatMessage(section.heading)}</h3>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.id} className="text-body-regular text-text-secondary">
                  {formatMessage(paragraph)}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 id="annexes" className="text-title-2-medium tracking-tight text-text-primary scroll-mt-20">
              {formatMessage({ id: "page.dpa.annexes.heading", defaultMessage: "Annexes" })}
            </h2>
            <p className="text-body-regular text-text-secondary">
              {formatMessage({
                id: "page.dpa.annexes.intro",
                defaultMessage:
                  "The annexes describe the processing, the security measures and the sub-processors. Sensical may update them as described in sections 6 and 8 without you accepting this DPA again.",
              })}
            </p>
          </div>
          {annexes.map((annex) => (
            <section key={annex.id} id={annex.id} className="flex flex-col gap-5 scroll-mt-20">
              <h3 className="text-title-3-medium text-text-primary">{annex.heading}</h3>
              {annex.groups.map((group) => (
                <div key={group.id} className="flex flex-col gap-2">
                  <h4 className="text-body-medium text-text-primary">{formatMessage(group.heading)}</h4>
                  {group.paragraphs.map((paragraph) => (
                    <p key={paragraph.id} className="text-body-regular text-text-secondary">
                      {formatMessage(paragraph)}
                    </p>
                  ))}
                  {group.items.length > 0 && (
                    <ul className="ml-5 flex list-disc flex-col gap-1">
                      {group.items.map((item) => (
                        <li key={item.id} className="text-body-regular text-text-secondary">
                          {formatMessage(item)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}

          <section id="annex-3" className="flex flex-col gap-3 scroll-mt-20">
            <h3 className="text-title-3-medium text-text-primary">{subProcessorsHeading}</h3>
            <p className="text-body-regular text-text-secondary">
              {formatMessage({
                id: "page.dpa.annex3.intro",
                defaultMessage: "Sensical uses the following sub-processors. None of them processes the data outside the EU.",
              })}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-separator-border">
                    <th scope="col" className="py-2 pr-4 text-caption-1-medium text-text-tertiary">
                      {formatMessage({ id: "page.dpa.annex3.col.name", defaultMessage: "Sub-processor" })}
                    </th>
                    <th scope="col" className="py-2 pr-4 text-caption-1-medium text-text-tertiary">
                      {formatMessage({ id: "page.dpa.annex3.col.service", defaultMessage: "Service" })}
                    </th>
                    <th scope="col" className="py-2 text-caption-1-medium text-text-tertiary">
                      {formatMessage({ id: "page.dpa.annex3.col.location", defaultMessage: "Location" })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subProcessors.map((row) => (
                    <tr key={row.id} className="border-b border-separator-border align-top">
                      <td className="py-2 pr-4 text-body-medium text-text-primary">{row.name}</td>
                      <td className="py-2 pr-4 text-body-regular text-text-secondary">{formatMessage(row.service)}</td>
                      <td className="py-2 text-body-regular text-text-secondary">{formatMessage(row.location)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
