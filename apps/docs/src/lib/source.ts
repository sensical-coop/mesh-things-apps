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

// Urls stay root-relative (`/overview`): links go through the router, whose basepath adds `/docs`.
export const docsSource = loader({
  baseUrl: "/",
  i18n: docsI18n,
  source: docs.toFumadocsSource(),
});
