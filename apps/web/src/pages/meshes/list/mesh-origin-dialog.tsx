import type { SourceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiArrowRightSLine } from "@remixicon/react";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { sourceTitle } from "@/features/source/model";

export type MeshOriginDialogProps = {
  open: boolean;
  sources: readonly Pick<SourceRead, "id" | "label" | "server" | "topic">[];
  onClose: () => void;
  /** Null for the default broker, which asks for the mesh terms next; a source id skips them. */
  onChoose: (sourceId: string | null) => void;
};

const optionClass =
  "flex w-full items-center justify-between gap-3 rounded-2xl border border-separator-border px-4 py-3 text-start outline-hidden hover:bg-background-secondary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring";

/**
 * Operators only, the first step of "Create mesh": where its traffic comes from.
 * A mesh on a source is covered by that source's terms, so only the default broker
 * leads to the mesh terms.
 */
export function MeshOriginDialog({ open, sources, onClose, onChoose }: MeshOriginDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <Modal
      open={open}
      title={formatMessage({ id: "feature.mesh.originDialog.title", defaultMessage: "Where does this mesh's traffic come from?" })}
      description={formatMessage({
        id: "feature.mesh.originDialog.description",
        defaultMessage:
          "The default broker asks you to accept the mesh terms next. A source is already covered by the terms you accepted for it.",
      })}
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        <ul className="flex flex-col gap-2">
          <li>
            <button type="button" className={optionClass} onClick={() => onChoose(null)}>
              <span className="flex flex-col">
                <span className="text-body-medium text-text-primary">
                  {formatMessage({ id: "feature.mesh.originDialog.default", defaultMessage: "Default broker" })}
                </span>
                <span className="text-caption-1-regular text-text-tertiary">
                  {formatMessage({
                    id: "feature.mesh.originDialog.defaultHint",
                    defaultMessage: "Gateways publish to this instance's own broker.",
                  })}
                </span>
              </span>
              <RiArrowRightSLine aria-hidden className="size-5 shrink-0 text-text-tertiary" />
            </button>
          </li>
          {sources.map((source) => (
            <li key={source.id}>
              <button type="button" className={optionClass} onClick={() => onChoose(source.id)}>
                <span className="flex min-w-0 flex-col">
                  <span className="text-body-medium text-text-primary">{sourceTitle(source)}</span>
                  <span className="truncate font-mono text-caption-1-regular text-text-tertiary">
                    {source.server} {source.topic}
                  </span>
                </span>
                <RiArrowRightSLine aria-hidden className="size-5 shrink-0 text-text-tertiary" />
              </button>
            </li>
          ))}
        </ul>
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.mesh.originDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
