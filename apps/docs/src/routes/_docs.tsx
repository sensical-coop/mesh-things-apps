import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { DocsLayout } from "fumadocs-ui/layouts/spacious";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { type ComponentProps, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { DocumentationActions } from "@/components/actions";
import { BrandMark } from "@/components/brand";
import { DocumentationHeader } from "@/components/header";
import { useDocsTranslations } from "@/hooks/use-docs-translations";
import { useLocale } from "@/hooks/use-locale";
import { docsSource } from "@/lib/source";

export const Route = createFileRoute("/_docs")({
  // Locale comes from localStorage. Rendering the tree on the server would lock the first language.
  ssr: false,
  component: DocumentationLayout,
});

// Fumadocs passes the public href as `to`. With the router basepath that prefixes `/docs` again,
// so `/docs/quality` in the MDX becomes `/docs/docs/quality`. `href` is rewritten back to one prefix.
function DocsLink({ href, prefetch = true, ...props }: { href?: string; prefetch?: boolean; children?: ReactNode } & Omit<ComponentProps<"a">, "href" | "children">) {
  if (!href || href.startsWith("#") || /^[a-z]+:/i.test(href)) return <a href={href} {...props} />;
  return <Link {...({ href, preload: prefetch ? "intent" : false, ...props } as ComponentProps<typeof Link>)} />;
}

function DocumentationLayout() {
  const [locale] = useLocale();
  const translations = useDocsTranslations();
  const { formatMessage } = useIntl();

  return (
    <RootProvider components={{ Link: DocsLink }} theme={{ enabled: false }} search={{ options: { api: "/docs/api/search" } }} i18n={{ locale, defaultLanguage: "en", hideLocale: "always", translations }}>
      <div className="docs-portal">
        <DocsLayout
          tree={docsSource.getPageTree(locale)}
          nav={{
            // Plain anchor: the router basepath would turn "/" into "/docs". Caddy serves the marketing site at "/".
            title: (props) => (
              <a href="/" {...props}>
                <BrandMark className="h-3" />
                <span className="sr-only">Sensical</span>
                <span className="text-text-secondary">{formatMessage({ id: "common.navigation.docs", defaultMessage: "Docs" })}</span>
              </a>
            ),
          }}
          themeSwitch={{ enabled: false }}
          slots={{ actions: DocumentationActions, header: DocumentationHeader }}
        >
          <Outlet />
        </DocsLayout>
      </div>
    </RootProvider>
  );
}
