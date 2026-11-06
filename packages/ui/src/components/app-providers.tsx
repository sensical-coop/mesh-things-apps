import type { ReactElement, ReactNode } from "react";
import { IntlProvider } from "react-intl";
import { z } from "zod";
import { en, es } from "zod/locales";
import { useLocale } from "@mtt/ui/hooks/use-locale";
import { DEFAULT_LOCALE, type Locale } from "@mtt/ui/locale";

const ZOD_LOCALE_PACKS: Record<Locale, typeof en> = { en, es };

export type AppProvidersProps = {
  messages: Record<Locale, Record<string, string>>;
  children: ReactNode;
};

export function AppProviders({ messages, children }: AppProvidersProps): ReactElement {
  const [locale] = useLocale();
  z.config(ZOD_LOCALE_PACKS[locale]());

  return (
    <IntlProvider key={locale} locale={locale} defaultLocale={DEFAULT_LOCALE} messages={messages[locale]}>
      {children}
    </IntlProvider>
  );
}
