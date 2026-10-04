import { Button } from "@mtt/ui/components/base/buttons/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mtt/ui/components/ui/select";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { RiKey2Line } from "@remixicon/react";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { CodeBlock } from "@/components/code-block";
import { StatusCopy } from "@/components/status-copy";
import { useFormatters } from "@/hooks/use-formatters";
import { awsCliCommand, duckdbCommand, duckdbExportCommand, meshSlug } from "@/features/archive/model";
import type { ArchiveCredentialsState } from "@/features/archive/use-archive-credentials";

export type ArchiveConnectFrameProps = {
  access: ArchiveCredentialsState;
  /** The mesh's path in the bucket, from the file list; the credentials name the bucket. */
  prefix: string | undefined;
  /** Names the merged file and the copied folder. */
  meshTitle: string;
};

type QueryMode = "query" | "file" | "mirror";

const QUERY_MODES: readonly QueryMode[] = ["query", "file", "mirror"];

function isQueryMode(value: unknown): value is QueryMode {
  return QUERY_MODES.some((mode) => mode === value);
}

/**
 * Temporary S3 credentials for the mesh's path, and a command for the way the caller wants
 * the archive: queried in place, merged into one file, or copied as stored. The secret is
 * shown once; issuing again gives a new set.
 */
export function ArchiveConnectFrame({ access, prefix, meshTitle }: ArchiveConnectFrameProps): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const { credentials, error } = access;
  const [mode, setMode] = useState<QueryMode>("query");
  const path = prefix ?? "<prefix>";
  const name = meshSlug(meshTitle);

  const modes: Record<QueryMode, { label: string; hint: string; command: string; commandLabel: string }> = {
    query: {
      label: formatMessage({ id: "feature.archive.query.modes.query", defaultMessage: "Query the whole mesh (DuckDB)" }),
      hint: formatMessage({
        id: "feature.archive.query.modes.queryHint",
        defaultMessage: "Reads every hour as one dataset without downloading it. Works the same in pandas, pyarrow or any S3 client.",
      }),
      command: duckdbCommand(credentials, path),
      commandLabel: formatMessage({ id: "feature.archive.query.modes.queryLabel", defaultMessage: "DuckDB command" }),
    },
    file: {
      label: formatMessage({ id: "feature.archive.query.modes.file", defaultMessage: "One file (DuckDB)" }),
      hint: formatMessage(
        {
          id: "feature.archive.query.modes.fileHint",
          defaultMessage: "Merges every hour into {file}, with dt and hour as columns.",
        },
        { file: `${name}.parquet` },
      ),
      command: duckdbExportCommand(credentials, path, `${name}.parquet`),
      commandLabel: formatMessage({ id: "feature.archive.query.modes.fileLabel", defaultMessage: "DuckDB export command" }),
    },
    mirror: {
      label: formatMessage({ id: "feature.archive.query.modes.mirror", defaultMessage: "Every file as stored (AWS CLI)" }),
      hint: formatMessage(
        {
          id: "feature.archive.query.modes.mirrorHint",
          defaultMessage: "Copies the dt=…/hour=… folders into {folder}. Run it again later to fetch only new or rewritten hours.",
        },
        { folder: name },
      ),
      command: awsCliCommand(credentials, path, name),
      commandLabel: formatMessage({ id: "feature.archive.query.modes.mirrorLabel", defaultMessage: "AWS CLI command" }),
    },
  };
  const current = modes[mode];

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
        <FrameTitle>{formatMessage({ id: "feature.archive.connect.title", defaultMessage: "Query" })}</FrameTitle>
        <FrameDescription>
          {formatMessage({
            id: "feature.archive.connect.description",
            defaultMessage:
              "Choose how you want to work with this mesh's archive, then issue credentials to fill them into the command.",
          })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Select
            items={QUERY_MODES.map((value) => ({ value, label: modes[value].label }))}
            value={mode}
            onValueChange={(next) => isQueryMode(next) && setMode(next)}
          >
            <SelectTrigger
              size="sm"
              className="min-w-64"
              aria-label={formatMessage({ id: "feature.archive.query.modeLabel", defaultMessage: "How to use the archive" })}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {QUERY_MODES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {modes[value].label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
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
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-body-regular text-text-secondary">{current.hint}</p>
          <CodeBlock code={current.command} label={current.commandLabel} />
        </div>
      </FramePanel>
    </Frame>
  );
}
