import { createFromSource } from "fumadocs-core/search/server";
import { defineHandler } from "nitro";
import { docsSource } from "../../src/lib/docs-source.ts";

const search = createFromSource(docsSource, {
  // hideLocale keeps one URL per page, so the index id has to carry the language.
  async buildIndex(page) {
    const data = page.data.structuredData;
    const structuredData = typeof data === "function" ? await data() : data;
    return {
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      id: `${page.locale ?? "en"}:${page.url}`,
      structuredData,
    };
  },
});

export default defineHandler((event) => search.GET(event.req));
