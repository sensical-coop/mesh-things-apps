import { notFound, useParams } from "@tanstack/react-router";
import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { docsSource } from "@/lib/docs-source";

export function DocumentationPage() {
  const { _splat } = useParams({ strict: false });
  const page = docsSource.getPage(_splat?.split("/") ?? []);
  if (!page) throw notFound();
  const Content = page.data.body;

  return (
    <DocsPage toc={page.data.toc} tableOfContent={{ enabled: false }}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsBody>
        <Content components={defaultMdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}
