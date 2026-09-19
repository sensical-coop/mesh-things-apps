import type { ReactElement, ReactNode } from "react";
import { IntlProvider } from "react-intl";
import { z } from "zod";
import { en, es } from "zod/locales";
import { useLocale } from "@/hooks/use-locale";
import { DEFAULT_LOCALE, type Locale } from "@/lib/locale";
import { MESSAGES } from "@/lib/messages";

const ZOD_LOCALE_PACKS: Record<Locale, typeof en> = { en, es };

export function AppProviders({ children }: { children: ReactNode }): ReactElement {
  const [locale] = useLocale();
  z.config(ZOD_LOCALE_PACKS[locale]());

  return (
    <IntlProvider key={locale} locale={locale} defaultLocale={DEFAULT_LOCALE} messages={MESSAGES[locale]}>
      {children}
    </IntlProvider>
  );
}
