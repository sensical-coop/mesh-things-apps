import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { dialogActionsClass } from "@/lib/dialog-actions";

export type StartRefusedDialogProps = {
  /** Why the API refused to start; empty keeps the dialog closed. */
  reasons: readonly string[];
  blueprintName: string;
  /** Offered when the blueprint has calibrated steps, since that's the usual gap. */
  onCalibrate: (() => void) | undefined;
  onClose: () => void;
};

/** Explains why a blueprint couldn't start on a device, and points at the fix when there is one. */
export function StartRefusedDialog({ reasons, blueprintName, onCalibrate, onClose }: StartRefusedDialogProps): ReactElement {
  const { formatMessage } = useIntl();

  return (
    <Modal
      open={reasons.length > 0}
      title={formatMessage({ id: "feature.postprocessing.startRefused.title", defaultMessage: "Couldn't start this processing" })}
      description={formatMessage(
        {
          id: "feature.postprocessing.startRefused.description",
          defaultMessage: "{name} needs to be set up before it can run on this device.",
        },
        { name: blueprintName },
      )}
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        <ul className="flex flex-col gap-1">
          {reasons.map((reason) => (
            <li key={reason} className="text-body-regular text-text-primary">
              {reason}
            </li>
          ))}
        </ul>
        <div className={dialogActionsClass}>
          <Button type="button" variant={onCalibrate ? "secondary" : "primary"} size="small" onClick={onClose}>
            {formatMessage({ id: "feature.postprocessing.startRefused.close", defaultMessage: "Close" })}
          </Button>
          {onCalibrate ? (
            <Button
              type="button"
              variant="primary"
              size="small"
              onClick={() => {
                onClose();
                onCalibrate();
              }}
            >
              {formatMessage({ id: "feature.postprocessing.startRefused.calibrate", defaultMessage: "Open calibration" })}
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
