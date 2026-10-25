import { createFileRoute, notFound, useParams } from "@tanstack/react-router";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/spacious/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { DocumentationNotFound } from "@/components/not-found";
import { DocsDiagram } from "@/components/diagram";
import { useLocale } from "@/hooks/use-locale";
import { docsSource } from "@/lib/source";

export const Route = createFileRoute("/_docs/$")({
  ssr: false,
  component: DocumentationPage,
  notFoundComponent: DocumentationNotFound,
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/").filter(Boolean) ?? [];
    if (!docsSource.getPage(slugs)) throw notFound();
  },
});

function DocumentationPage() {
  const { _splat } = useParams({ strict: false });
  const [locale] = useLocale();
  const slugs = _splat?.split("/").filter(Boolean) ?? [];
  const page = docsSource.getPage(slugs, locale) ?? docsSource.getPage(slugs);
  if (!page) throw notFound();
  const Content = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <Content components={{ ...defaultMdxComponents, Diagram: DocsDiagram }} />
      </DocsBody>
    </DocsPage>
  );
}
