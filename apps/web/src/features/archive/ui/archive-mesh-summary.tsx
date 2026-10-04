import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { formatBytes, type ArchiveSummary } from "@/features/archive/model";

export type ArchiveMeshSummaryProps = {
  devices: number;
  archived: number;
  /** Null while the mesh's file list loads or if it failed. */
  summary: ArchiveSummary | null;
};

/** One line on the chosen mesh: how many of its devices are stored and what's stored so far. */
export function ArchiveMeshSummary({ devices, archived, summary }: ArchiveMeshSummaryProps): ReactElement {
  const { formatMessage, locale } = useIntl();
  const parts = [
    formatMessage(
      { id: "feature.archive.summary.devices", defaultMessage: "{archived} of {devices} devices in S3" },
      { archived, devices },
    ),
  ];
  if (summary) {
    parts.push(
      formatMessage(
        { id: "feature.archive.summary.files", defaultMessage: "{count,plural,one{# file} other{# files}}" },
        { count: summary.files },
      ),
      formatBytes(summary.bytes, locale),
    );
    if (summary.last) {
      parts.push(
        formatMessage({ id: "feature.archive.summary.last", defaultMessage: "latest hour {hour} UTC" }, { hour: summary.last }),
      );
    }
  }
  return <p className="text-body-regular tabular-nums text-text-secondary">{parts.join(" · ")}</p>;
}
