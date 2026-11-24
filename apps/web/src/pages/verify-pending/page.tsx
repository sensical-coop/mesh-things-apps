import { useLogout } from "@mtt/contracts/session";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useResendVerification } from "@mtt/contracts/resend-verification";
import { ResendButton } from "@mtt/ui/forms/resend-button";
import { AuthCard } from "@/features/auth/ui/auth-card";
import { AuthPage } from "@/features/auth/ui/auth-page";
import { BlankScreen } from "@/features/auth/ui/blank-screen";
import { authRepository } from "@/features/auth/repository";
import { activeSessionRedirect } from "@/features/auth/guest-gate";
import { routes } from "@/router";

export function VerifyPendingPage(): ReactElement {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const me = useQuery(authRepository.me());
  const { pending: loggingOut, logout } = useLogout(() => navigate({ to: routes.login }));
  const resend = useResendVerification(me.data?.email_verification_sent_at ?? null);

  if (me.isPending) return <BlankScreen />;
  if (!me.isSuccess) return <Navigate to={routes.signup} />;
  const redirect = activeSessionRedirect(me);
  if (redirect) return redirect;

  return (
    <AuthPage bare>
      <AuthCard
        title={formatMessage({ id: "page.verifyPending.title", defaultMessage: "Check your email" })}
        announceSubtitle
        subtitle={
          <FormattedMessage
            id="page.verifyPending.body"
            defaultMessage="We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account."
            values={{
              strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
              email: me.data.email,
            }}
          />
        }
      >
        <ResendButton {...resend} />
        <Button type="button" size="small" variant="secondary" disabled={loggingOut} onClick={logout}>
          {formatMessage({ id: "page.verifyPending.signOut", defaultMessage: "Not you? Sign out" })}
        </Button>
      </AuthCard>
    </AuthPage>
  );
}
