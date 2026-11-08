import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export function ResendButton({
  remaining,
  pending,
  failed,
  onResend,
}: {
  remaining: number;
  pending: boolean;
  failed: boolean;
  onResend: () => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  const label =
    remaining > 0
      ? formatMessage(
          { id: "page.verifyPending.resend.countdown", defaultMessage: "Resend available in {seconds}s" },
          { seconds: remaining },
        )
      : pending
        ? formatMessage({ id: "page.verifyPending.resend.sending", defaultMessage: "Sending" })
        : formatMessage({ id: "page.verifyPending.resend.button", defaultMessage: "Resend email" });

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="small"
        variant="secondary"
        className="tabular-nums"
        disabled={remaining > 0 || pending}
        onClick={onResend}
      >
        {label}
      </Button>
      {failed && !pending ? (
        <p className="text-body-regular text-text-secondary" role="alert">
          {formatMessage({
            id: "page.verifyPending.resend.error",
            defaultMessage: "We couldn't resend the email. Check back in a moment.",
          })}
        </p>
      ) : null}
    </div>
  );
}
