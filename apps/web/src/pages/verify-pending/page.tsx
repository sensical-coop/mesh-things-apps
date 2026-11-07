import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FramePanel } from "@mtt/ui/reui/frame";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { LanguageSwitcher } from "@mtt/ui/components/language-switcher";
import { AuthPage } from "@/features/auth/ui/auth-page";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";
import { activeSessionRedirect, useSessionProbe } from "@/features/auth/guest-gate";
import { routes } from "@/router";
import { ResendButton } from "@/features/auth/ui/resend-button";

export function VerifyPendingPage(): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const me = useSessionProbe();
  const logout = useMutation({
    ...authRepository.logout(),
    onSuccess: async () => {
      queryClient.clear();
      await navigate({ to: routes.login });
    },
  });

  if (me.isPending) return <div className="min-h-svh bg-background-full" />;
  if (me.error) return <Navigate to={routes.signup} />;
  const redirect = activeSessionRedirect(me);
  if (redirect) return redirect;
  if (!me.data) return <div className="min-h-svh bg-background-full" />;

  const owner = me.data;

  return (
    <AuthPage
      header={
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <LanguageSwitcher />
        </div>
      }
    >
      <Frame className="w-full shadow-card" spacing="lg">
        <FramePanel className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-title-2-medium tracking-tight text-text-primary">
                {formatMessage({ id: "page.verifyPending.title", defaultMessage: "Check your email" })}
              </h1>
              <StatusCopy>
                <FormattedMessage
                  id="page.verifyPending.body"
                  defaultMessage="We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account."
                  values={{
                    strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
                    email: owner.email,
                  }}
                />
              </StatusCopy>
            </div>
            <ResendButton sentAt={owner.email_verification_sent_at} />
            <Button
              type="button"
              size="small"
              variant="secondary"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              {formatMessage({ id: "page.verifyPending.signOut", defaultMessage: "Not you? Sign out" })}
            </Button>
        </FramePanel>
      </Frame>
    </AuthPage>
  );
}
