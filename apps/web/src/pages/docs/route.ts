import { lazyRouteComponent, notFound } from "@tanstack/react-router";

export type DocumentationLoaderContext = { params: { _splat?: string } };

export const docsPage = {
  path: "$" as const,
  component: lazyRouteComponent(() => import("./page"), "DocumentationPage"),
  notFoundComponent: lazyRouteComponent(() => import("./not-found"), "DocumentationNotFound"),
  loader: async ({ params }: DocumentationLoaderContext) => {
    const { docsSource } = await import("@/lib/docs-source");
    const slugs = params._splat?.split("/").filter(Boolean) ?? [];
    if (!docsSource.getPage(slugs)) throw notFound();
  },
};
