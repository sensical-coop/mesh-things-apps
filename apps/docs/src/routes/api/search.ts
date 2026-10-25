import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { docsSource } from "@/lib/source";

const search = createFromSource(docsSource, {
  async buildIndex(page) {
    const data = page.data.structuredData;
    const structuredData = typeof data === "function" ? await data() : data;
    const url = page.url;
    return {
      title: page.data.title,
      description: page.data.description,
      url,
      id: `${page.locale ?? "en"}:${url}`,
      structuredData,
    };
  },
});

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => search.GET(request),
    },
  },
});
