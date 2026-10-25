import { defineI18n } from "fumadocs-core/i18n";
import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";

const docs = defineDocs({ dir: "content/docs" });

export const docsI18n = defineI18n({
  languages: ["en", "es"],
  defaultLanguage: "en",
  hideLocale: "always",
  parser: "dir",
  fallbackLanguage: "en",
});

// Vite `base` is `/docs/`, and TanStack Start uses that as the router basepath.
// Urls here stay root-relative (`/overview`) so links are not prefixed a second time.
// The public address is `/docs` + this path.
export const docsSource = loader({
  baseUrl: "/",
  i18n: docsI18n,
  source: docs.toFumadocsSource(),
});
