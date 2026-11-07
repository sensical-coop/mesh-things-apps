import { useResendVerification } from "@mtt/contracts/resend-verification";
import { ResendButton as UiResendButton } from "@mtt/ui/forms/resend-button";
import type { ReactElement } from "react";

export function ResendButton({ sentAt, next }: { sentAt: string | null; next: string }): ReactElement {
  const resend = useResendVerification(sentAt, next);
  return (
    <UiResendButton remaining={resend.remaining} pending={resend.pending} failed={resend.failed} onResend={resend.resend} />
  );
}
