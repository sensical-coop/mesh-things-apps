import type { IntlShape } from "react-intl";

export function formatGapShort(seconds: number | null, formatMessage: IntlShape["formatMessage"]): string {
  if (seconds == null || !Number.isFinite(seconds)) {
    return formatMessage({ id: "common.format.emDash", defaultMessage: "—" });
  }
  if (seconds < 60) {
    return formatMessage(
      { id: "page.devices.detail.quality.gapSeconds", defaultMessage: "{count}s" },
      { count: Math.round(seconds) },
    );
  }
  return formatMessage(
    { id: "page.devices.detail.quality.gapMinutes", defaultMessage: "{count} min" },
    { count: Math.round(seconds / 60) },
  );
}
