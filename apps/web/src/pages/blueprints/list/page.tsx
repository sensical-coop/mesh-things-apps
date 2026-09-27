import type { PostprocessingBlueprint } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { DataTable } from "@mtt/ui/components/data-table";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { RiAddLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { blueprintRepository } from "@/features/blueprint/repository";
import { BlueprintAccessChip } from "@/features/blueprint/ui/blueprint-access-chip";
import { BlueprintDialog } from "@/features/blueprint/ui/blueprint-dialog";
import { pageHeadingClass } from "@/lib/page-heading";
import { routes } from "@/router";

const col = legacyCreateColumnHelper<PostprocessingBlueprint>();

export function BlueprintsPage(): ReactElement {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { meId, ownerName } = useOwnerDirectory();
  const blueprints = useQuery(blueprintRepository.list());
  const [creating, setCreating] = useState(false);

  const columns = useMemo(
    () => [
      col.accessor("name", {
        header: formatMessage({ id: "page.blueprints.list.columns.name", defaultMessage: "Blueprint" }),
        cell: (info) => (
          <Link
            to={routes.blueprint}
            params={{ blueprintId: info.row.original.id }}
            className="rounded-full outline-none hover:text-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      col.accessor("is_public", {
        header: formatMessage({ id: "page.blueprints.list.columns.access", defaultMessage: "Access" }),
        cell: (info) => <BlueprintAccessChip blueprint={info.row.original} />,
      }),
      col.accessor("owner_id", {
        header: formatMessage({ id: "page.blueprints.list.columns.owner", defaultMessage: "Owner" }),
        cell: (info) => {
          const ownerId = info.getValue();
          return (
            <span className="text-text-secondary">
              {ownerId === null
                ? formatMessage({ id: "page.blueprints.list.ownerGone", defaultMessage: "Deleted account" })
                : ownerId === meId
                  ? formatMessage({ id: "page.blueprints.list.ownerYou", defaultMessage: "You" })
                  : ownerName(ownerId)}
            </span>
          );
        },
      }),
      col.accessor((row) => row.latest_version.number, {
        id: "version",
        header: formatMessage({ id: "page.blueprints.list.columns.version", defaultMessage: "Latest version" }),
        cell: (info) => <span className="tabular-nums text-text-secondary">v{info.getValue()}</span>,
      }),
      col.accessor(
        (row) =>
          [...row.latest_version.steps]
            .sort((a, b) => a.order - b.order)
            .map((step) => step.function_name)
            .join(" → "),
        {
          id: "steps",
          header: formatMessage({ id: "page.blueprints.list.columns.steps", defaultMessage: "Steps" }),
          cell: (info) => <span className="font-mono text-caption-1-regular text-text-secondary">{info.getValue()}</span>,
        },
      ),
      col.accessor((row) => row.latest_version.device_count, {
        id: "devices",
        header: formatMessage({ id: "page.blueprints.list.columns.devices", defaultMessage: "Devices on latest" }),
        cell: (info) => <span className="tabular-nums text-text-secondary">{info.getValue()}</span>,
      }),
    ],
    [formatMessage, meId, ownerName],
  );

  return (
    <>
      <div className={pageHeadingClass}>
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
          {formatMessage({ id: "page.blueprints.list.title", defaultMessage: "Blueprints" })}
        </h1>
        <Button type="button" size="small" leadingIcon={RiAddLine} onClick={() => setCreating(true)}>
          {formatMessage({ id: "page.blueprints.list.newBlueprint", defaultMessage: "New blueprint" })}
        </Button>
      </div>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle>{formatMessage({ id: "page.blueprints.list.panel.title", defaultMessage: "Recipes" })}</FrameTitle>
          <FrameDescription>
            {blueprints.error
              ? formatMessage({
                  id: "page.blueprints.list.panel.error",
                  defaultMessage: "Blueprints didn't load. Check your connection to the API and try again.",
                })
              : formatMessage({
                  id: "page.blueprints.list.panel.description",
                  defaultMessage:
                    "Your blueprints and public ones. Attach one to a device from the device page, where you wire its inputs and calibrate it.",
                })}
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          {blueprints.isPending ? <SkeletonRows /> : null}
          {blueprints.error || blueprints.isPending ? null : (
            <DataTable
              data={blueprints.data}
              columns={columns}
              getRowId={(row) => row.id}
              previousPageLabel={formatMessage({ id: "common.dataTable.previousPage", defaultMessage: "Previous page" })}
              nextPageLabel={formatMessage({ id: "common.dataTable.nextPage", defaultMessage: "Next page" })}
              pageRangeOfLabel={formatMessage({ id: "common.dataTable.of", defaultMessage: "of" })}
              empty={formatMessage({
                id: "page.blueprints.list.none",
                defaultMessage: "No blueprints yet. Create one to compute new channels from your devices' readings.",
              })}
            />
          )}
        </FramePanel>
      </Frame>
      {creating ? (
        <BlueprintDialog
          onClose={() => setCreating(false)}
          onSaved={(blueprintId) => void navigate({ to: routes.blueprint, params: { blueprintId } })}
        />
      ) : null}
    </>
  );
}
