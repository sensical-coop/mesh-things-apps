import { Button } from "@mtt/ui/components/base/buttons/button";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { useLocale } from "@/hooks/use-locale";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/locale";

const LOCALE_LABELS: Record<Locale, string> = { en: "EN", es: "ES" };

export function LanguageSwitcher({ className }: { className?: string }): ReactElement {
  const [locale, setLocale] = useLocale();
  const { formatMessage } = useIntl();
  const currentIndex = SUPPORTED_LOCALES.indexOf(locale);
  const nextLocale = SUPPORTED_LOCALES[(currentIndex + 1) % SUPPORTED_LOCALES.length] ?? locale;

  return (
    <Button
      type="button"
      variant="secondary"
      size="small"
      className={className}
      aria-label={formatMessage({ id: "common.languageSwitcher.label", defaultMessage: "Change language" })}
      onClick={() => setLocale(nextLocale)}
    >
      {LOCALE_LABELS[locale]}
    </Button>
  );
}
