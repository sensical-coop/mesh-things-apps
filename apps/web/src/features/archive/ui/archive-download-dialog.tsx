import { Button, ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { RiDownloadLine, RiKey2Line } from "@remixicon/react";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { CodeBlock } from "@/components/code-block";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { useFormatters } from "@/hooks/use-formatters";
import { API_URL } from "@/lib/api-url";
import { awsCliCommand, duckdbExportCommand, formatBytes, zipDownloadUrl } from "@/features/archive/model";
import type { ArchiveCredentialsState } from "@/features/archive/use-archive-credentials";

export type ArchiveDownloadDialogProps = {
  open: boolean;
  onClose: () => void;
  access: ArchiveCredentialsState;
  meshId: string;
  prefix: string;
  meshTitle: string;
  files: number;
  bytes: number;
};

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mesh";
}

/**
 * The whole archive at once: one zip from the API, a folder per day. The commands
 * suit scripts and large archives: DuckDB merges everything into one file, the AWS CLI
 * mirrors the files and later fetches only what changed.
 */
export function ArchiveDownloadDialog({
  open,
  onClose,
  access,
  meshId,
  prefix,
  meshTitle,
  files,
  bytes,
}: ArchiveDownloadDialogProps): ReactElement {
  const { formatMessage, locale } = useIntl();
  const { formatWhen } = useFormatters();
  const name = slug(meshTitle);
  const { credentials } = access;

  return (
    <Modal
      open={open}
      size="large"
      title={formatMessage(
        { id: "feature.archive.downloadAll.title", defaultMessage: "Download all — {mesh}" },
        { mesh: meshTitle },
      )}
      description={formatMessage(
        {
          id: "feature.archive.downloadAll.description",
          defaultMessage: "{count, plural, one {# hourly file} other {# hourly files}}, {size} in total.",
        },
        { count: files, size: formatBytes(bytes, locale) },
      )}
      onClose={onClose}
    >
      <div className="flex min-w-0 flex-col gap-6">
        <section className="oa-squircle-inset flex flex-col gap-3 bg-background-secondary-default p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="text-body-medium text-text-primary">
              {formatMessage({ id: "feature.archive.downloadAll.zip", defaultMessage: "One zip" })}
            </h3>
            <p className="text-caption-1-regular text-text-secondary">
              {formatMessage({
                id: "feature.archive.downloadAll.zipHint",
                defaultMessage:
                  "A folder per day, each hour named after its date and hour, e.g. 2026-09-28/2026-09-28_09.parquet.",
              })}
            </p>
          </div>
          <ButtonLink href={zipDownloadUrl(API_URL, meshId)} size="small" leadingIcon={RiDownloadLine} className="shrink-0">
            {formatMessage({ id: "feature.archive.downloadAll.zipButton", defaultMessage: "Download ZIP" })}
          </ButtonLink>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="text-body-medium text-text-primary">
              {formatMessage({ id: "feature.archive.downloadAll.commands", defaultMessage: "From the command line" })}
            </h3>
            <p className="text-caption-1-regular text-text-secondary">
              {credentials
                ? formatMessage(
                    {
                      id: "feature.archive.downloadAll.valid",
                      defaultMessage: "Credentials filled in, valid until {when}. They aren't shown again.",
                    },
                    { when: formatWhen(credentials.expires_at) },
                  )
                : formatMessage({
                    id: "feature.archive.downloadAll.needCredentials",
                    defaultMessage: "For scripts and large archives. Issue credentials to fill them into the commands.",
                  })}
            </p>
          </div>
          {credentials ? null : (
            <Button
              type="button"
              size="small"
              variant="secondary"
              leadingIcon={RiKey2Line}
              className="shrink-0"
              disabled={access.pending}
              onClick={access.issue}
            >
              {access.pending
                ? formatMessage({ id: "feature.archive.connect.issuing", defaultMessage: "Issuing" })
                : formatMessage({ id: "feature.archive.connect.issue", defaultMessage: "Issue credentials" })}
            </Button>
          )}
        </div>
        {access.error ? <StatusCopy>{access.error}</StatusCopy> : null}
        <section className="flex min-w-0 flex-col gap-2">
          <h4 className="text-body-medium text-text-primary">
            {formatMessage({ id: "feature.archive.downloadAll.oneFile", defaultMessage: "One Parquet file (DuckDB)" })}
          </h4>
          <p className="text-caption-1-regular text-text-secondary">
            {formatMessage(
              {
                id: "feature.archive.downloadAll.oneFileHint",
                defaultMessage: "Merges every hour into {file}, with dt and hour as columns.",
              },
              { file: `${name}.parquet` },
            )}
          </p>
          <CodeBlock
            code={duckdbExportCommand(credentials, prefix, `${name}.parquet`)}
            label={formatMessage({ id: "feature.archive.downloadAll.oneFileLabel", defaultMessage: "DuckDB export command" })}
          />
        </section>
        <section className="flex min-w-0 flex-col gap-2">
          <h4 className="text-body-medium text-text-primary">
            {formatMessage({ id: "feature.archive.downloadAll.asStored", defaultMessage: "Every file as stored (AWS CLI)" })}
          </h4>
          <p className="text-caption-1-regular text-text-secondary">
            {formatMessage(
              {
                id: "feature.archive.downloadAll.asStoredHint",
                defaultMessage: "Copies the dt=…/hour=… folders into {folder}. Run it again later to fetch only new or rewritten hours.",
              },
              { folder: name },
            )}
          </p>
          <CodeBlock
            code={awsCliCommand(credentials, prefix, name)}
            label={formatMessage({ id: "feature.archive.downloadAll.asStoredLabel", defaultMessage: "AWS CLI command" })}
          />
        </section>
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.archive.downloadAll.close", defaultMessage: "Close" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
