import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { docsSource } from "@/lib/source";

const search = createFromSource(docsSource, {
  buildIndex(page) {
    const url = page.url;
    return {
      title: page.data.title,
      description: page.data.description,
      url,
      id: `${page.locale ?? "en"}:${url}`,
      structuredData: page.data.structuredData,
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
