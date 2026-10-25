import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { docsSource } from "@/lib/source";

const search = createFromSource(docsSource, {
  async buildIndex(page) {
    const data = page.data.structuredData;
    const structuredData = typeof data === "function" ? await data() : data;
    // `page.url` is root-relative (`/overview`). The app is mounted at `/docs`.
    const url = page.url === "/" ? "/docs" : `/docs${page.url}`;
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
