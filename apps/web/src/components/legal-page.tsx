import { type ReactElement, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { LandingFooter } from "@/components/landing-footer";
import { SiteHeader } from "@/components/site-header";

/** The periods and the contact the legal texts quote in several sections, interpolated into their messages. */
export const LEGAL_VALUES = {
  contactEmail: "info@sensical.es",
  noticeDays: 30,
  deletionDays: 30,
  backupDays: 7,
  inflightDays: 7,
  logDays: 30,
  recordsYears: 5,
};

/** A legal page's contents list: a part heading, and the sections under it. */
export const tocHeadingClass = "text-body-regular text-accent-500 underline underline-offset-2";
export const tocLinkClass =
  "text-caption-1-regular text-text-tertiary underline underline-offset-2 hover:text-text-secondary";

export type LegalPageProps = {
  title: string;
  /** Shown under the title: last-updated line, intro. */
  paragraphs: string[];
  /** The `<li>` entries of the contents list. */
  contents: ReactNode;
  children: ReactNode;
};

export function LegalPage({ title, paragraphs, contents, children }: LegalPageProps): ReactElement {
  const { formatMessage } = useIntl();
  const contentsLabel = formatMessage({ id: "common.legalPage.contents", defaultMessage: "Contents" });

  return (
    <div className="flex min-h-svh flex-col bg-background-full">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-12  sm:px-6 sm:pt-16 sm:pb-20">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-1-medium tracking-tight text-text-primary">{title}</h1>
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-body-regular text-text-secondary">
              {paragraph}
            </p>
          ))}
        </div>

        <nav aria-label={contentsLabel}>
          <p className="text-caption-1-medium tracking-label text-text-tertiary uppercase">{contentsLabel}</p>
          <ol className="mt-3 flex flex-col gap-1">{contents}</ol>
        </nav>

        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
