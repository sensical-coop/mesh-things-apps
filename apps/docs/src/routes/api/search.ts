import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { DEFAULT_LOCALE } from "@mtt/ui/locale";
import { SITE_PATHS } from "@mtt/contracts/site";
import { docsSource } from "@/lib/source";

const search = createFromSource(docsSource, {
  buildIndex(page) {
    // Search navigates by public href, which carries the `/docs` base.
    const url = page.url === "/" ? SITE_PATHS.docs : `${SITE_PATHS.docs}${page.url}`;
    return {
      title: page.data.title,
      description: page.data.description,
      url,
      id: `${page.locale ?? DEFAULT_LOCALE}:${url}`,
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
