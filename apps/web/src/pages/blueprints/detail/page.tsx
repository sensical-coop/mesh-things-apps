import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { RiDeleteBinLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { Link, notFound, useNavigate, useParams } from "@tanstack/react-router";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { DetailHeading } from "@/components/detail-heading";
import { SettingsButton } from "@/components/settings-button";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { useMe } from "@/features/auth/use-me";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { canEditBlueprint } from "@/features/blueprint/model";
import { blueprintRepository } from "@/features/blueprint/repository";
import { BlueprintAccessChip } from "@/features/blueprint/ui/blueprint-access-chip";
import { BlueprintDetailsDialog } from "@/features/blueprint/ui/blueprint-details-dialog";
import { BlueprintDialog } from "@/features/blueprint/ui/blueprint-dialog";
import { DeleteBlueprintDialog } from "@/features/blueprint/ui/delete-blueprint-dialog";
import { VersionSummary } from "@/features/blueprint/ui/version-summary";
import { useFormatters } from "@/hooks/use-formatters";
import { isNotFoundError } from "@/lib/not-found";
import { routes } from "@/router";

/** One blueprint and its versions, newest first. Versions are immutable: changing steps adds one. */
export function BlueprintPage(): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const navigate = useNavigate();
  const { blueprintId } = useParams({ from: routes.blueprint });
  const { me, meId } = useMe();
  const { ownerName } = useOwnerDirectory();
  const blueprint = useQuery(blueprintRepository.retrieve(blueprintId));
  if (isNotFoundError(blueprint.error)) throw notFound();
  const versions = useQuery(blueprintRepository.versions(blueprintId));
  const [editing, setEditing] = useState(false);
  const [addingVersion, setAddingVersion] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const row = blueprint.data;
  const editable = row ? canEditBlueprint(row, me) : false;
  const newestFirst = [...(versions.data ?? [])].sort((a, b) => b.number - a.number);

  return (
    <>
      <DetailHeading
        crumb={
          <Link to={routes.blueprints}>
            {formatMessage({ id: "page.blueprint.breadcrumb", defaultMessage: "Blueprints" })}
          </Link>
        }
        title={row?.name ?? formatMessage({ id: "page.blueprint.fallbackTitle", defaultMessage: "Blueprint" })}
        badges={row ? <BlueprintAccessChip blueprint={row} /> : null}
        actions={
          row && editable ? (
            <>
              <Button type="button" size="small" onClick={() => setAddingVersion(true)}>
                {formatMessage({ id: "page.blueprint.newVersion", defaultMessage: "New version" })}
              </Button>
              <SettingsButton
                size="small"
                label={formatMessage({ id: "page.blueprint.edit", defaultMessage: "Edit blueprint" })}
                onClick={() => setEditing(true)}
              />
              <Button
                type="button"
                size="small"
                variant="danger"
                iconOnly
                leadingIcon={RiDeleteBinLine}
                aria-label={formatMessage({ id: "page.blueprint.delete", defaultMessage: "Delete blueprint" })}
                title={formatMessage({ id: "page.blueprint.delete", defaultMessage: "Delete blueprint" })}
                onClick={() => setDeleting(true)}
              />
            </>
          ) : null
        }
      />
      {blueprint.error ? (
        <StatusCopy>
          {formatMessage({
            id: "page.blueprint.notFound",
            defaultMessage: "This blueprint doesn't exist, or it isn't yours and isn't public.",
          })}
        </StatusCopy>
      ) : null}
      {row ? (
        <p className="mb-6 max-w-prose text-body-regular text-text-secondary">
          {row.description ? `${row.description} ` : ""}
          {row.owner_id === null
            ? formatMessage({ id: "page.blueprint.ownerGone", defaultMessage: "Its owner deleted their account." })
            : row.owner_id === meId
              ? null
              : formatMessage({ id: "page.blueprint.ownedBy", defaultMessage: "By {owner}." }, { owner: ownerName(row.owner_id) })}
        </p>
      ) : null}
      <div className="flex flex-col gap-6">
        {versions.isPending ? (
          <Frame className="shadow-card">
            <FramePanel>
              <SkeletonRows />
            </FramePanel>
          </Frame>
        ) : null}
        {newestFirst.map((version, index) => (
          <Frame key={version.number} className="shadow-card">
            <FrameHeader>
              <FrameTitle>
                {index === 0
                  ? formatMessage(
                      { id: "page.blueprint.version.latest", defaultMessage: "Version {number} · latest" },
                      { number: version.number },
                    )
                  : formatMessage({ id: "page.blueprint.version.title", defaultMessage: "Version {number}" }, { number: version.number })}
              </FrameTitle>
              <FrameDescription>
                {formatMessage(
                  {
                    id: "page.blueprint.version.meta",
                    defaultMessage: "{when} · {count, plural, =0 {no devices} one {# device} other {# devices}}",
                  },
                  { when: formatWhen(version.created_at), count: version.device_count },
                )}
                {version.notes ? ` · ${version.notes}` : ""}
              </FrameDescription>
            </FrameHeader>
            <FramePanel>
              <VersionSummary version={version} />
            </FramePanel>
          </Frame>
        ))}
      </div>
      <BlueprintDetailsDialog blueprint={editing && row ? row : null} onClose={() => setEditing(false)} />
      {addingVersion && row ? <BlueprintDialog blueprint={row} onClose={() => setAddingVersion(false)} /> : null}
      <DeleteBlueprintDialog
        blueprint={deleting && row ? row : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => void navigate({ to: routes.blueprints })}
      />
    </>
  );
}
