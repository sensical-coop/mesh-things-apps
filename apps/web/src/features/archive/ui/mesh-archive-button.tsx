import type { DeviceRead, Mesh } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { cx } from "@mtt/ui/utils";
import { RiArchiveFill, RiArchiveLine } from "@remixicon/react";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { meshArchiveState } from "@/features/archive/model";
import { MeshArchiveDialog } from "@/features/archive/ui/mesh-archive-dialog";
import { meshTitle } from "@/features/mesh/model";

export type MeshArchiveButtonProps = {
  mesh: Pick<Mesh, "id" | "label" | "channel_id">;
  /** The mesh's devices; only those whose setting the API sent are switched. */
  devices: readonly DeviceRead[];
  className?: string;
};

/**
 * Opens the confirmation to store every device of a mesh, or none. Filled while all are
 * stored, outlined in the accent while only some are.
 */
export function MeshArchiveButton({ mesh, devices, className }: MeshArchiveButtonProps): ReactElement {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);
  const state = meshArchiveState(devices);
  const all = state.devices > 0 && state.archived === state.devices;
  const label = formatMessage(
    {
      id: "feature.archive.meshButton.label",
      defaultMessage: "{devices,plural,one{S3 storage for {mesh}: {archived} of # device} other{S3 storage for {mesh}: {archived} of # devices}}",
    },
    { mesh: meshTitle(mesh), archived: state.archived, devices: state.devices },
  );
  return (
    <>
      <Button
        type="button"
        size="xs"
        variant="secondary"
        iconOnly
        leadingIcon={all ? RiArchiveFill : RiArchiveLine}
        className={cx(state.archived > 0 && "text-accent-500", className)}
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      />
      {open ? <MeshArchiveDialog mesh={mesh} devices={devices} open onClose={() => setOpen(false)} /> : null}
    </>
  );
}
