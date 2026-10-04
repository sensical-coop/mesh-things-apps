import { RiInformationLine } from "@remixicon/react";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { EXPORT_FILE_HOURS, EXPORT_HISTORY_DAYS, EXPORT_MAX_DAYS } from "@/features/export/model";

/** The limits every download form states up front, so a refusal is never a surprise. */
export function ExportLimits(): ReactElement {
  const { formatMessage } = useIntl();
  const items = [
    formatMessage(
      { id: "feature.export.limits.days", defaultMessage: "Up to {days} days per download. If you need longer periods of time, you will need to request several files." },
      { days: EXPORT_MAX_DAYS },
    ),
    formatMessage({
      id: "feature.export.limits.oneAtATime",
      defaultMessage: "One download is prepared at a time. You will be able to request the next one once the current download is ready.",
    }),
    formatMessage(
      {
        id: "feature.export.limits.kept",
        defaultMessage:
          "Once you request the download, the file will be available for {hours} hours, and we email you when it's ready. Previous downloads stay listed for {days} days so you can request them again.",
      },
      { hours: EXPORT_FILE_HOURS, days: EXPORT_HISTORY_DAYS },
    ),
  ];
  return (
    <section
      className="oa-squircle-inset flex gap-3 bg-background-secondary-default p-4"
      aria-label={formatMessage({ id: "feature.export.limits.title", defaultMessage: "Download limits" })}
    >
      <RiInformationLine className="mt-0.5 size-4 shrink-0 text-text-secondary" aria-hidden />
      <ul className="flex min-w-0 flex-col gap-1 text-caption-1-regular text-text-secondary">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
