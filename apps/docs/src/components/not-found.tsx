import { RiArrowLeftLine } from "@remixicon/react";
import { DocsPage } from "fumadocs-ui/layouts/spacious/page";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";

export function DocumentationNotFound(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <DocsPage toc={[]}>
      <section className="oa-squircle oa-arrive flex flex-col items-start gap-3 bg-background-secondary-default p-6 shadow-card sm:p-10">
        <p className="font-mono text-caption-1-regular text-text-tertiary">404</p>
        <h1 className="text-title-2-medium tracking-tight text-text-primary">
          {formatMessage({ id: "notFound.docsPage.title", defaultMessage: "Page not found" })}
        </h1>
        <p className="max-w-prose text-body-regular text-text-secondary">
          {formatMessage({
            id: "notFound.docsPage.description",
            defaultMessage: "The documentation has no page at this address.",
          })}
        </p>
        <a
          href="/overview"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-background-primary-default px-3 py-2 text-body-medium text-text-primary"
        >
          <RiArrowLeftLine aria-hidden className="size-4" />
          {formatMessage({ id: "notFound.docsPage.back", defaultMessage: "Back to the documentation" })}
        </a>
      </section>
    </DocsPage>
  );
}
