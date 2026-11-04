import { Button } from "@mtt/ui/components/base/buttons/button";
import { useLocale } from "@mtt/ui/hooks/use-locale";
import { SUPPORTED_LOCALES, type Locale } from "@mtt/ui/locale";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";

const LOCALE_LABELS: Record<Locale, string> = { en: "EN", es: "ES" };

export function LanguageSwitcher(): ReactElement {
  const [locale, setLocale] = useLocale();
  const { formatMessage } = useIntl();
  const currentIndex = SUPPORTED_LOCALES.indexOf(locale);
  const nextLocale = SUPPORTED_LOCALES[(currentIndex + 1) % SUPPORTED_LOCALES.length] ?? locale;

  return (
    <Button
      type="button"
      variant="secondary"
      size="small"
      aria-label={formatMessage({ id: "common.languageSwitcher.label", defaultMessage: "Change language" })}
      onClick={() => setLocale(nextLocale)}
    >
      {LOCALE_LABELS[locale]}
    </Button>
  );
}
