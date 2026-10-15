import { defineI18n } from "fumadocs-core/i18n";
import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { routes } from "../router/router";

const docs = defineDocs({ dir: "content/docs" });

export const docsI18n = defineI18n({
  languages: ["en", "es"],
  defaultLanguage: "en",
  hideLocale: "always",
  parser: "dir",
  fallbackLanguage: "en",
});

export const docsSource = loader({
  baseUrl: routes.docs,
  i18n: docsI18n,
  source: docs.toFumadocsSource(),
});
