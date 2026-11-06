import { Button } from "@mtt/ui/components/base/buttons/button";
import { secondsUntilResendAllowed } from "@/features/auth/resend-cooldown";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { authRepository } from "@/features/auth/repository";

export function ResendButton({ sentAt }: { sentAt: string | null }): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const resend = useMutation({
    ...authRepository.resendVerification(),
    onSuccess: async () => {
      setError(false);
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
    },
    onError: async () => {
      setError(true);
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
    },
  });

  const remaining = secondsUntilResendAllowed(sentAt, now);
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
      <Button
        type="button"
        size="small"
        variant="secondary"
        className="tabular-nums"
        disabled={remaining > 0 || resend.isPending}
        onClick={() => resend.mutate({ data: { next: "/start" } })}
      >
        {label}
      </Button>
      {error ? (
        <p className="text-body-medium text-text-secondary" role="alert">
          {formatMessage({
            id: "page.verifyPending.resend.error",
            defaultMessage: "The email was not sent. Try again in a moment.",
          })}
        </p>
      ) : null}
    </div>
  );
}
