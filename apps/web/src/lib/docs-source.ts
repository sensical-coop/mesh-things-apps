import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { routes } from "../router/router";

const docs = defineDocs({ dir: "content/docs" });

export const docsSource = loader({
  baseUrl: routes.docs,
  source: docs.toFumadocsSource(),
});
