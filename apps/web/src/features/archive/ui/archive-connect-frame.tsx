import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { RiKey2Line } from "@remixicon/react";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { CodeBlock } from "@/components/code-block";
import { StatusCopy } from "@/components/status-copy";
import { useFormatters } from "@/hooks/use-formatters";
import { duckdbCommand } from "@/features/archive/model";
import type { ArchiveCredentialsState } from "@/features/archive/use-archive-credentials";

export type ArchiveConnectFrameProps = {
  access: ArchiveCredentialsState;
  /** The mesh's path in the bucket, from the file list; the credentials name the bucket. */
  prefix: string | undefined;
};

/**
 * Temporary S3 credentials for the mesh's path, and a DuckDB command that reads it as
 * one dataset. The secret is shown once; issuing again gives a new set.
 */
export function ArchiveConnectFrame({ access, prefix }: ArchiveConnectFrameProps): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const { credentials, error } = access;

  const rows: [string, string][] = credentials
    ? [
        [formatMessage({ id: "feature.archive.connect.bucket", defaultMessage: "Bucket" }), credentials.bucket],
        [formatMessage({ id: "feature.archive.connect.path", defaultMessage: "Path" }), credentials.s3_path],
        [
          formatMessage({ id: "feature.archive.connect.endpoint", defaultMessage: "Endpoint" }),
          credentials.endpoint ??
            formatMessage({ id: "feature.archive.connect.endpointDefault", defaultMessage: "The provider's default (AWS)" }),
        ],
        [formatMessage({ id: "feature.archive.connect.region", defaultMessage: "Region" }), credentials.region],
        [formatMessage({ id: "feature.archive.connect.keyId", defaultMessage: "Access key ID" }), credentials.access_key_id],
      ]
    : [];

  return (
    <Frame className="shadow-card">
      <FrameHeader>
        <FrameTitle>{formatMessage({ id: "feature.archive.connect.title", defaultMessage: "Query with DuckDB" })}</FrameTitle>
        <FrameDescription>
          {formatMessage({
            id: "feature.archive.connect.description",
            defaultMessage:
              "Issue credentials that read this mesh's archive and nothing else, then paste the command into DuckDB. They also work with pandas, pyarrow or any S3 client.",
          })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption-1-regular text-text-tertiary">
            {credentials
              ? formatMessage(
                  {
                    id: "feature.archive.connect.expires",
                    defaultMessage:
                      "Valid until {when}, even if you lose access before then. The secret isn't shown again: copy the command now.",
                  },
                  { when: formatWhen(credentials.expires_at) },
                )
              : formatMessage({
                  id: "feature.archive.connect.hint",
                  defaultMessage: "Credentials last about an hour and can't be revoked. Keep them to yourself.",
                })}
          </p>
          <Button
            type="button"
            size="small"
            variant={credentials ? "secondary" : "primary"}
            leadingIcon={RiKey2Line}
            className="shrink-0"
            disabled={access.pending}
            onClick={access.issue}
          >
            {access.pending
              ? formatMessage({ id: "feature.archive.connect.issuing", defaultMessage: "Issuing" })
              : credentials
                ? formatMessage({ id: "feature.archive.connect.reissue", defaultMessage: "Issue new credentials" })
                : formatMessage({ id: "feature.archive.connect.issue", defaultMessage: "Issue credentials" })}
          </Button>
        </div>
        {error ? <StatusCopy>{error}</StatusCopy> : null}
        {credentials ? (
          <dl className="oa-arrive grid gap-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex min-w-0 flex-col gap-1">
                <dt className="text-caption-1-medium text-text-secondary">{label}</dt>
                <dd className="min-w-0 break-all font-mono text-caption-1-regular text-text-primary">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <CodeBlock
          code={duckdbCommand(credentials, prefix ?? "<prefix>")}
          label={formatMessage({ id: "feature.archive.connect.commandLabel", defaultMessage: "DuckDB command" })}
        />
      </FramePanel>
    </Frame>
  );
}
