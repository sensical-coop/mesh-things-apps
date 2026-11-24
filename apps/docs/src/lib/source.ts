import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@mtt/ui/locale";
import { defineI18n } from "fumadocs-core/i18n";
import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";

const docs = defineDocs({ dir: "content/docs" });

export const docsI18n = defineI18n({
  languages: [...SUPPORTED_LOCALES],
  defaultLanguage: DEFAULT_LOCALE,
  hideLocale: "always",
  parser: "dir",
  fallbackLanguage: DEFAULT_LOCALE,
});

// Urls stay root-relative (`/overview`): links go through the router, whose basepath adds `/docs`.
export const docsSource = loader({
  baseUrl: "/",
  i18n: docsI18n,
  source: docs.toFumadocsSource(),
});
