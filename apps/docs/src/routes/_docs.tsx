import { cx } from "@mtt/ui/utils";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { DocsLayout } from "fumadocs-ui/layouts/spacious";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { type MouseEvent, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { DocumentationActions } from "@/components/actions";
import { BrandMark } from "@/components/brand";
import { DocumentationHeader } from "@/components/header";
import { useDocsTranslations } from "@/hooks/use-docs-translations";
import { useLocale } from "@/hooks/use-locale";
import { docsSource } from "@/lib/source";
import { webAppUrl } from "@/lib/web-app-url";

export const Route = createFileRoute("/_docs")({
  // Locale comes from localStorage. Rendering the tree on the server would lock the first language.
  ssr: false,
  component: DocumentationLayout,
});

type DocsLinkProps = {
  href?: string;
  prefetch?: boolean;
  children?: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  target?: string;
  rel?: string;
  title?: string;
};

// A query string is not part of the page slug. TanStack keeps it in `search`.
function pageHref(href: string): { path: string; hash?: string; search?: Record<string, string> } {
  const hashAt = href.indexOf("#");
  const beforeHash = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 || href.slice(hashAt + 1) === "" ? undefined : href.slice(hashAt + 1);
  const queryAt = beforeHash.indexOf("?");
  const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  if (queryAt === -1) return { path, hash };
  const search: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(beforeHash.slice(queryAt))) search[key] = value;
  return { path, hash, search };
}

// Fumadocs gives a public path (`/overview`). The splat route owns every page under `/`.
function DocsLink({ href, prefetch = true, children, className, ...rest }: DocsLinkProps) {
  if (!href || href.startsWith("#") || /^[a-z]+:/i.test(href)) {
    return (
      <a href={href} className={className} {...rest}>
        {children}
      </a>
    );
  }
  const { path, hash, search } = pageHref(href);
  const preload = prefetch ? "intent" : false;
  if (path === "/" || path === "") {
    return (
      <Link to="/" hash={hash} search={search} preload={preload} className={className} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/$" params={{ _splat: path.replace(/^\//, "") }} hash={hash} search={search} preload={preload} className={className} {...rest}>
      {children}
    </Link>
  );
}

function DocumentationLayout() {
  const [locale] = useLocale();
  const translations = useDocsTranslations();
  const { formatMessage } = useIntl();

  return (
    <RootProvider components={{ Link: DocsLink }} theme={{ enabled: false }} search={{ options: { api: "/api/search" } }} i18n={{ locale, defaultLanguage: "en", hideLocale: "always", translations }}>
      <div className="docs-portal">
        <DocsLayout
          tree={docsSource.getPageTree(locale)}
          nav={{
            title: (props) => (
              <a href={webAppUrl} {...props} className={cx("inline-flex items-center gap-2", props.className)}>
                <BrandMark className="h-3" />
                <span>{formatMessage({ id: "common.navigation.docs", defaultMessage: "Docs" })}</span>
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
