import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import appCss from "@/styles.css?url";
import { AppProviders } from "@mtt/ui/components/app-providers";
import { useLocale } from "@mtt/ui/hooks/use-locale";
import { headInitScripts } from "@mtt/ui/init-scripts";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Docs · Sensical" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const [locale] = useLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {headInitScripts.map((script, index) => (
          // Server and client bundles stringify the init functions differently; the script already ran.
          <script key={index} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: script }} />
        ))}
        <HeadContent />
      </head>
      <body>
        <AppProviders messages={{ en, es }}>
          <Outlet />
        </AppProviders>
        <Scripts />
      </body>
    </html>
  );
}
