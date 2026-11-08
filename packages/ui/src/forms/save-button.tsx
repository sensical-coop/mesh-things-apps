import { Button } from "@mtt/ui/components/base/buttons/button";
import { Spinner } from "@mtt/ui/components/ui/spinner";
import { cx } from "@mtt/ui/utils/cx";
import { RiCheckLine } from "@remixicon/react";
import { type ReactElement, useEffect, useState } from "react";
import { useIntl } from "react-intl";

const SAVED_MS = 2000;

export type SaveButtonProps = {
  pending: boolean;
  saved: boolean;
  /** Changes on every save (e.g. the mutation's `submittedAt`), so each success shows the saved label again. */
  savedKey: number;
};

export function SaveButton({ pending, saved, savedKey }: SaveButtonProps): ReactElement {
  const { formatMessage } = useIntl();
  const labels = {
    save: formatMessage({ id: "common.saveButton.save", defaultMessage: "Save changes" }),
    saving: formatMessage({ id: "common.saveButton.saving", defaultMessage: "Saving" }),
    saved: formatMessage({ id: "common.saveButton.saved", defaultMessage: "Saved" }),
  };
  const [expiredKey, setExpiredKey] = useState<number | null>(null);
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setExpiredKey(savedKey), SAVED_MS);
    return () => clearTimeout(timer);
  }, [saved, savedKey]);
  const showSaved = !pending && saved && expiredKey !== savedKey;

  return (
    <Button
      type="submit"
      size="small"
      variant={pending || showSaved ? "secondary" : "primary"}
      disabled={pending}
      aria-live="polite"
      leadingIcon={pending ? Spinner : showSaved ? RiCheckLine : undefined}
      className={cx(
        "transition-colors duration-200",
        showSaved && "text-state-success-text hover:text-state-success-text",
      )}
    >
      {pending ? labels.saving : showSaved ? labels.saved : labels.save}
    </Button>
  );
}
