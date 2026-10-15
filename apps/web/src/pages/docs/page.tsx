import { notFound, useParams } from "@tanstack/react-router";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/spacious/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { useLocale } from "@/hooks/use-locale";
import { docsSource } from "@/lib/docs-source";
import { DocsMermaid } from "@/pages/docs/mermaid";

export function DocumentationPage() {
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
        <Content components={{ ...defaultMdxComponents, Mermaid: DocsMermaid }} />
      </DocsBody>
    </DocsPage>
  );
}
