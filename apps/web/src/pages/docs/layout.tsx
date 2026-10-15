import { Outlet } from "@tanstack/react-router";
import { DocsLayout } from "fumadocs-ui/layouts/spacious";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { BrandMark } from "@/components/brand";
import { useLocale } from "@/hooks/use-locale";
import { docsSource } from "@/lib/docs-source";
import { DocumentationActions } from "@/pages/docs/actions";
import { DocumentationHeader } from "@/pages/docs/header";
import { routes } from "@/router";

export function DocumentationLayout() {
  const [locale] = useLocale();

  return (
    <RootProvider theme={{ enabled: false }} i18n={{ locale, defaultLanguage: "en", hideLocale: "always" }}>
      <div className="docs-portal">
        <DocsLayout
          tree={docsSource.getPageTree(locale)}
          nav={{
            title: <><BrandMark className="h-3" /><span className="sr-only">Sensical</span><span className="text-text-secondary">Docs</span></>,
            url: routes.home,
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
