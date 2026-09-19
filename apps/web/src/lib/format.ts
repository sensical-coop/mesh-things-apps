import { Temporal } from "temporal-polyfill";

function toZoned(iso: string): Temporal.ZonedDateTime | null {
  const timeZone = Temporal.Now.timeZoneId();
  try {
    return Temporal.Instant.from(iso).toZonedDateTimeISO(timeZone);
  } catch {
    try {
      return Temporal.PlainDateTime.from(iso).toZonedDateTime(timeZone);
    } catch {
      return null;
    }
  }
}

const whenOpts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
const clockOpts: Intl.DateTimeFormatOptions = { timeStyle: "short" };

export type FormatLabels = {
  neverSeen: string;
  yes: string;
  no: string;
  emDash: string;
  hourUnit: string;
  minuteUnit: string;
  secondUnit: string;
};

export const EN_FORMAT_LABELS: FormatLabels = {
  neverSeen: "Never seen",
  yes: "Yes",
  no: "No",
  emDash: "—",
  hourUnit: "h",
  minuteUnit: "min",
  secondUnit: "s",
};

export function formatWhen(iso: string | null, locale?: string, labels: FormatLabels = EN_FORMAT_LABELS): string {
  if (!iso) return labels.neverSeen;
  return toZoned(iso)?.toLocaleString(locale, whenOpts) ?? iso;
}

const relativeUnits = ["year", "month", "week", "day", "hour", "minute", "second"] as const;

/** Temporal has no toRelative; Instant.until + RelativeTimeFormat is the MDN path. */
export function toRelative(iso: string, locale?: string): string | null {
  const zoned = toZoned(iso);
  if (!zoned) return null;
  const now = Temporal.Now.zonedDateTimeISO(zoned.timeZoneId);
  const duration = zoned.until(now, { largestUnit: "year", smallestUnit: "second" });
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const parts = {
    year: duration.years,
    month: duration.months,
    week: duration.weeks,
    day: duration.days,
    hour: duration.hours,
    minute: duration.minutes,
    second: duration.seconds,
  };
  for (const unit of relativeUnits) {
    const n = parts[unit];
    if (n !== 0) return rtf.format(-n, unit);
  }
  return rtf.format(0, "second");
}

export function formatLastSeen(iso: string | null, locale?: string, labels: FormatLabels = EN_FORMAT_LABELS): string {
  if (!iso) return labels.neverSeen;
  const abs = formatWhen(iso, locale, labels);
  const rel = toRelative(iso, locale);
  return rel ? `${abs} (${rel})` : abs;
}

export function formatClock(iso: string, locale?: string): string {
  return toZoned(iso)?.toLocaleString(locale, clockOpts) ?? iso;
}

export function formatValue(value: unknown, locale?: string, labels: FormatLabels = EN_FORMAT_LABELS): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString(locale, { maximumFractionDigits: 2 });
  }
  if (typeof value === "boolean") return value ? labels.yes : labels.no;
  if (value == null) return labels.emDash;
  return String(value);
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function formatRatio(
  value: number | null | undefined,
  locale?: string,
  labels: FormatLabels = EN_FORMAT_LABELS,
): string {
  if (value == null || !Number.isFinite(value)) return labels.emDash;
  return value.toLocaleString(locale, { style: "percent", maximumFractionDigits: 0 });
}

/** Seconds as hours, minutes, seconds. Empty or invalid → em dash. */
export function formatSecondsAsHms(
  seconds: number | null | undefined,
  locale?: string,
  labels: FormatLabels = EN_FORMAT_LABELS,
): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return labels.emDash;
  const total = Math.trunc(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} ${labels.hourUnit}`);
  if (m) parts.push(`${m} ${labels.minuteUnit}`);
  if (s || parts.length === 0) parts.push(`${s} ${labels.secondUnit}`);
  return parts.join(" ");
}

export function triBool(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}
