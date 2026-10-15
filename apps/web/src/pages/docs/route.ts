import { lazyRouteComponent, notFound } from "@tanstack/react-router";

export type DocumentationLoaderContext = { params: { _splat?: string } };

export const docsPage = {
  path: "$" as const,
  component: lazyRouteComponent(() => import("./page"), "DocumentationPage"),
  loader: async ({ params }: DocumentationLoaderContext) => {
    const { docsSource } = await import("@/lib/docs-source");
    if (!docsSource.getPage(params._splat?.split("/") ?? [])) throw notFound();
  },
};
