import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FramePanel } from "@mtt/ui/reui/frame";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ShaderBackdrop } from "@/components/auth-shader-backdrop";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";
import { isOwnerSession } from "@/features/auth/session";
import { routes } from "@/router";
import { ResendButton } from "./resend-button";

export function VerifyPendingPage(): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery({ ...authRepository.me(), retry: false });
  const logout = useMutation({
    ...authRepository.logout(),
    onSuccess: async () => {
      queryClient.clear();
      await navigate({ to: routes.login });
    },
  });

  if (me.isPending) return <div className="min-h-svh bg-background-full" />;
  if (me.error) return <Navigate to={routes.signup} />;
  if (isOwnerSession(me)) return <Navigate to={routes.meshes} />;

  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-background-secondary-default px-4 py-16 sm:px-6 sm:py-24">
      <ShaderBackdrop />
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSwitcher />
      </div>
      <div className="relative w-full max-w-md">
        <Frame className="shadow-card w-full" spacing="lg">
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
                    email: me.data.email,
                  }}
                />
              </StatusCopy>
            </div>
            <ResendButton sentAt={me.data.email_verification_sent_at} />
            <Button
              type="button"
              size="small"
              variant="secondary"
              disabled={logout.isPending}
              onClick={() => logout.mutate({})}
            >
              {formatMessage({ id: "page.verifyPending.signOut", defaultMessage: "Not you? Sign out" })}
            </Button>
          </FramePanel>
        </Frame>
      </div>
    </main>
  );
}
