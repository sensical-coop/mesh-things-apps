import { DocsPage } from "fumadocs-ui/layouts/spacious/page";
import { NotFound } from "@/components/not-found";

export function DocumentationNotFound() {
  return (
    <DocsPage toc={[]}>
      <NotFound kind="docsPage" />
    </DocsPage>
  );
}
