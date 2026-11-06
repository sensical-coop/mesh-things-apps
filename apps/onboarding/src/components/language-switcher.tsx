import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { Button } from "@mtt/ui/components/base/buttons/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@mtt/ui/components/ui/dropdown-menu";
import { useLocale } from "@mtt/ui/hooks/use-locale";
import { SUPPORTED_LOCALES, type Locale } from "@mtt/ui/locale";

// "size-" opts out of the menu item rule that forces svgs to size-4.
const FLAG_CLASS = "size-auto h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-black/10";

// Flat SVG flags: emoji flags look wavy on macOS and render as letters on Windows.
const LOCALES: Record<Locale, { flag: ReactElement; name: string }> = {
  en: {
    name: "English",
    flag: (
      <svg aria-hidden viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className={FLAG_CLASS}>
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 60,30M60,0 0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 60,30M60,0 0,30" stroke="#C8102E" strokeWidth="2" />
        <path d="M30,0v30M0,15h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0v30M0,15h60" stroke="#C8102E" strokeWidth="6" />
      </svg>
    ),
  },
  es: {
    name: "Español",
    flag: (
      <svg aria-hidden viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" className={FLAG_CLASS}>
        <rect width="3" height="2" fill="#AA151B" />
        <rect y="0.5" width="3" height="1" fill="#F1BF00" />
      </svg>
    ),
  },
};

export function LanguageSwitcher({ className }: { className?: string }): ReactElement {
  const [locale, setLocale] = useLocale();
  const { formatMessage } = useIntl();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="secondary"
            size="small"
            className={className}
            aria-label={formatMessage({ id: "common.languageSwitcher.label", defaultMessage: "Change language" })}
          />
        }
      >
        {LOCALES[locale].flag}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        <DropdownMenuRadioGroup value={locale}>
          {SUPPORTED_LOCALES.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} lang={code} onClick={() => setLocale(code)}>
              {LOCALES[code].flag}
              {LOCALES[code].name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
