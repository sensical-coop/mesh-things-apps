import { ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { RiArrowDownSLine, RiArrowRightSLine, RiDownloadLine } from "@remixicon/react";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { useFormatters } from "@/hooks/use-formatters";
import { API_URL } from "@/lib/api-url";
import { formatBytes, partitionDownloadUrl, partitionLabel, zipDownloadUrl, type ArchiveDay } from "@/features/archive/model";

export type ArchiveDayRowProps = {
  meshId: string;
  day: ArchiveDay;
  expanded: boolean;
  onToggle: () => void;
};

const cellClass = "h-10 px-3.5 py-0 align-middle";

/** One UTC day of files, downloadable as one zip; expanded, one link per stored hour. */
export function ArchiveDayRow({ meshId, day, expanded, onToggle }: ArchiveDayRowProps): ReactElement {
  const { formatMessage, locale } = useIntl();
  const { formatWhen } = useFormatters();
  const hoursId = `archive-hours-${day.dt}`;
  const dayLabel = new Date(`${day.dt}T00:00:00Z`).toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <tr className="text-text-primary hover:bg-background-primary-hover">
        <td className={cellClass}>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full text-start outline-none hover:text-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            aria-expanded={expanded}
            aria-controls={hoursId}
            onClick={onToggle}
          >
            {expanded ? (
              <RiArrowDownSLine className="size-4 shrink-0" aria-hidden />
            ) : (
              <RiArrowRightSLine className="size-4 shrink-0" aria-hidden />
            )}
            <span className="tabular-nums">{dayLabel}</span>
          </button>
        </td>
        <td className={`${cellClass} tabular-nums text-text-secondary`}>
          {formatMessage(
            { id: "feature.archive.files.hourCount", defaultMessage: "{count, plural, one {# hour} other {# hours}}" },
            { count: day.hours.length },
          )}
        </td>
        <td className={`${cellClass} tabular-nums text-text-secondary`}>{formatBytes(day.bytes, locale)}</td>
        <td className={`${cellClass} tabular-nums text-text-secondary`}>{formatWhen(day.lastModified)}</td>
        <td className={`${cellClass} text-right`}>
          <ButtonLink
            href={zipDownloadUrl(API_URL, meshId, { start: day.dt, stop: day.dt })}
            size="xs"
            variant="secondary"
            leadingIcon={RiDownloadLine}
            aria-label={formatMessage(
              { id: "feature.archive.files.downloadDayLabel", defaultMessage: "Download every hour of {day} as a zip" },
              { day: dayLabel },
            )}
          >
            {formatMessage({ id: "feature.archive.files.downloadDay", defaultMessage: "ZIP" })}
          </ButtonLink>
        </td>
      </tr>
      {expanded ? (
        <tr id={hoursId}>
          <td colSpan={5} className="px-3.5 pb-3">
            <ul className="oa-arrive flex flex-wrap gap-1.5" aria-label={dayLabel}>
              {day.hours.map((hour) => (
                <li key={hour.hour}>
                  <ButtonLink
                    href={partitionDownloadUrl(API_URL, meshId, hour)}
                    size="xs"
                    variant="secondary"
                    className="tabular-nums"
                    title={formatBytes(hour.size, locale)}
                    aria-label={formatMessage(
                      { id: "feature.archive.files.downloadLabel", defaultMessage: "Download {hour}" },
                      { hour: partitionLabel(hour) },
                    )}
                  >
                    {`${String(hour.hour).padStart(2, "0")}:00`}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      ) : null}
    </>
  );
}
