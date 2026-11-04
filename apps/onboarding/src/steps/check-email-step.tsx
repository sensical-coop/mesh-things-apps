import { Button } from "@mtt/ui/components/base/buttons/button";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, type ReactNode, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { ResendButton } from "@/features/auth/resend-button";
import { authRepository } from "@/features/auth/repository";
import { StepHeading } from "./step-heading";

export function CheckEmailStep({ email, sentAt }: { email: string; sentAt: string | null }): ReactElement {
  const { formatMessage } = useIntl();
  const [notYet, setNotYet] = useState(false);
  const me = useQuery({
    ...authRepository.me(),
    retry: false,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  async function checkNow() {
    const owner = await me.refetch();
    setNotYet(owner.data?.is_active !== true);
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeading>
        {formatMessage({ id: "page.start.checkEmail.title", defaultMessage: "Check your email" })}
      </StepHeading>
      <p className="text-body-medium text-text-secondary">
        <FormattedMessage
          id="page.start.checkEmail.body"
          defaultMessage="We sent a confirmation link to <strong>{email}</strong>. Open it and this step continues on its own."
          values={{ strong: (chunks: ReactNode) => <strong>{chunks}</strong>, email }}
        />
      </p>
      <ResendButton sentAt={sentAt} />
      <Button type="button" size="medium" variant="secondary" disabled={me.isRefetching} onClick={() => void checkNow()}>
        {formatMessage({ id: "page.start.checkEmail.confirmed", defaultMessage: "I've confirmed my email" })}
      </Button>
      {notYet ? (
        <p className="text-body-medium text-text-secondary" role="status">
          {formatMessage({
            id: "page.start.checkEmail.notYet",
            defaultMessage: "That email is not confirmed yet. Open the link, then try again.",
          })}
        </p>
      ) : null}
    </div>
  );
}
