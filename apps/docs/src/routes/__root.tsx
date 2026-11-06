import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { IntlProvider } from "react-intl";
import appCss from "@/styles.css?url";
import { useLocale } from "@mtt/ui/hooks/use-locale";
import { DEFAULT_LOCALE, localeInitScript } from "@mtt/ui/locale";
import { themeInitScript } from "@mtt/ui/theme";
import { MESSAGES } from "@/lib/messages";

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
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: localeInitScript }} />
        <HeadContent />
      </head>
      <body>
        <IntlProvider key={locale} locale={locale} defaultLocale={DEFAULT_LOCALE} messages={MESSAGES[locale]}>
          <Outlet />
        </IntlProvider>
        <Scripts />
      </body>
    </html>
  );
}
