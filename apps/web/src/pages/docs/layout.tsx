import { Outlet } from "@tanstack/react-router";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { SiteHeader } from "@/components/site-header";
import { docsSource } from "@/lib/docs-source";
import { routes } from "@/router";

export function DocumentationLayout() {
  // ponytail: enable search when the portal grows beyond the starter page.
  return (
    <RootProvider theme={{ enabled: false }} search={{ enabled: false }}>
      <div className="docs-portal">
        <SiteHeader />
        <DocsLayout
          tree={docsSource.getPageTree()}
          nav={{ title: "Docs", url: routes.docs }}
          themeSwitch={{ enabled: false }}
          searchToggle={{ enabled: false }}
        >
          <Outlet />
        </DocsLayout>
      </div>
    </RootProvider>
  );
}
