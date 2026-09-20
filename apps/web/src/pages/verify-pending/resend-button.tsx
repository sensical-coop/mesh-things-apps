import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";
import { secondsUntilResendAllowed } from "./resend-cooldown";

export function ResendButton({ sentAt }: { sentAt: string | null }): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const resend = useMutation({
    ...authRepository.resendVerification(),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
    },
    onError: async () => {
      setError(
        formatMessage({
          id: "page.verifyPending.resend.error",
          defaultMessage: "We couldn't resend the email. Check back in a moment.",
        }),
      );
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
    },
  });

  const remaining = secondsUntilResendAllowed(sentAt, now);
  const disabled = remaining > 0 || resend.isPending;
  const label =
    remaining > 0
      ? formatMessage(
          { id: "page.verifyPending.resend.countdown", defaultMessage: "Resend available in {seconds}s" },
          { seconds: remaining },
        )
      : resend.isPending
        ? formatMessage({ id: "page.verifyPending.resend.sending", defaultMessage: "Sending" })
        : formatMessage({ id: "page.verifyPending.resend.button", defaultMessage: "Resend email" });

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" size="small" variant="secondary" disabled={disabled} onClick={() => resend.mutate({})}>
        {label}
      </Button>
      {error ? <StatusCopy>{error}</StatusCopy> : null}
    </div>
  );
}
