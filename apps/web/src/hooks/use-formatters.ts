import { useIntl } from "react-intl";
import { useLocale } from "@/hooks/use-locale";
import * as format from "@/lib/format";
import type { FormatLabels } from "@/lib/format";

export type Formatters = {
  formatWhen: (iso: string | null) => string;
  toRelative: (iso: string) => string | null;
  formatLastSeen: (iso: string | null) => string;
  formatClock: (iso: string) => string;
  formatValue: (value: unknown) => string;
  formatRatio: (value: number | null | undefined) => string;
  formatSecondsAsHms: (seconds: number | null | undefined) => string;
};

export function useFormatters(): Formatters {
  const [locale] = useLocale();
  const { formatMessage } = useIntl();

  const labels: FormatLabels = {
    neverSeen: formatMessage({ id: "common.format.neverSeen", defaultMessage: "Never seen" }),
    yes: formatMessage({ id: "common.format.yes", defaultMessage: "Yes" }),
    no: formatMessage({ id: "common.format.no", defaultMessage: "No" }),
    emDash: formatMessage({ id: "common.format.emDash", defaultMessage: "—" }),
    hourUnit: formatMessage({ id: "common.format.hourUnit", defaultMessage: "h" }),
    minuteUnit: formatMessage({ id: "common.format.minuteUnit", defaultMessage: "min" }),
    secondUnit: formatMessage({ id: "common.format.secondUnit", defaultMessage: "s" }),
  };

  return {
    formatWhen: (iso) => format.formatWhen(iso, locale, labels),
    toRelative: (iso) => format.toRelative(iso, locale),
    formatLastSeen: (iso) => format.formatLastSeen(iso, locale, labels),
    formatClock: (iso) => format.formatClock(iso, locale),
    formatValue: (value) => format.formatValue(value, locale, labels),
    formatRatio: (value) => format.formatRatio(value, locale, labels),
    formatSecondsAsHms: (seconds) => format.formatSecondsAsHms(seconds, locale, labels),
  };
}
