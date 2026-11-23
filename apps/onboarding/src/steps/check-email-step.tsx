import { isVerifiedOwner } from "@mtt/contracts/authz";
import { useResendVerification } from "@mtt/contracts/resend-verification";
import { SITE_PATHS } from "@mtt/contracts/site";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { ResendButton } from "@mtt/ui/forms/resend-button";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, type ReactNode, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { authRepository } from "@/features/auth/repository";
import { CheckEmailFigure } from "@/figures/check-email/figure";
import { POLL_MS } from "@/timing";
import { StepHeading } from "./step-heading";
import { StepLayout } from "./step-layout";

export function CheckEmailStep({ email, sentAt }: { email: string; sentAt: string | null }): ReactElement {
  const { formatMessage } = useIntl();
  const [notYet, setNotYet] = useState(false);
  const resend = useResendVerification(sentAt, SITE_PATHS.start);
  const me = useQuery({
    ...authRepository.me(),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });

  async function checkNow() {
    const owner = await me.refetch();
    setNotYet(!isVerifiedOwner(owner.data));
  }

  return (
    <StepLayout figure={<CheckEmailFigure />}>
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
      <ResendButton {...resend} />
      <Button type="button" size="medium" variant="secondary" disabled={me.isRefetching} onClick={() => void checkNow()}>
        {formatMessage({ id: "page.start.checkEmail.confirmed", defaultMessage: "Check again" })}
      </Button>
      {notYet ? (
        <p className="text-body-medium text-text-secondary" role="status">
          {formatMessage({
            id: "page.start.checkEmail.notYet",
            defaultMessage: "That email is not confirmed yet. Open the link, then try again.",
          })}
        </p>
      ) : null}
    </StepLayout>
  );
}
