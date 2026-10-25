import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { IntlProvider } from "react-intl";
import appCss from "@/styles.css?url";
import { useLocale } from "@/hooks/use-locale";
import { DEFAULT_LOCALE } from "@/lib/locale";
import { MESSAGES } from "@/lib/messages";

const themeScript = `(function(){try{var stored=localStorage.getItem("boardui:theme");var dark=stored?stored==="dark":false;document.documentElement.classList.toggle("dark",dark);}catch(e){document.documentElement.classList.remove("dark");}})();`;
const localeScript = `(function(){try{var stored=localStorage.getItem("mtt:locale");var supported=["en","es"];var lang=stored&&supported.indexOf(stored)>-1?stored:null;if(!lang){var langs=navigator.languages||[navigator.language];for(var i=0;i<langs.length;i++){var prefix=(langs[i]||"").split("-")[0];if(supported.indexOf(prefix)>-1){lang=prefix;break;}}}document.documentElement.lang=lang||"en";}catch(e){document.documentElement.lang="en";}})();`;

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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
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
