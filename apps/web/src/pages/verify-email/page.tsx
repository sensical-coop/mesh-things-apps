import { Frame, FramePanel } from "@mtt/ui/reui/frame";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { parseAsString, useQueryState } from "nuqs";
import { type ReactElement, useEffect } from "react";
import { useIntl } from "react-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ShaderBackdrop } from "@/components/auth-shader-backdrop";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";
import { isOwnerSession } from "@mtt/ui/session";
import { safeReturnPath } from "@/lib/return-path";
import { routes } from "@/router";

export function VerifyEmailPage(): ReactElement {
  const { formatMessage } = useIntl();
  const [token] = useQueryState("token", parseAsString);
  const [next] = useQueryState("next", parseAsString);
  const dest = safeReturnPath(next);
  const verify = useQuery({
    ...authRepository.verifyEmail({ token: token ?? "" }),
    enabled: Boolean(token),
    retry: false,
  });
  const me = useQuery({
    ...authRepository.me(),
    retry: false,
    enabled: verify.isSuccess && Boolean(dest),
  });
  const signedIn = Boolean(dest) && isOwnerSession(me);

  useEffect(() => {
    if (signedIn && dest) window.location.assign(dest);
  }, [signedIn, dest]);

  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-background-secondary-default px-4 py-16 sm:px-6 sm:py-24">
      <ShaderBackdrop />
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSwitcher />
      </div>
      <div className="relative w-full max-w-md">
        <Frame className="shadow-card w-full" spacing="lg">
          <FramePanel className="flex flex-col gap-6">
            <h1 className="text-title-2-medium tracking-tight text-text-primary">
              {formatMessage({ id: "page.verifyEmail.title", defaultMessage: "Email verification" })}
            </h1>
            {!token || verify.isPending ? (
              <StatusCopy>
                {formatMessage({
                  id: "page.verifyEmail.confirming",
                  defaultMessage: "Confirming your email address…",
                })}
              </StatusCopy>
            ) : verify.isSuccess ? (
              <>
                <StatusCopy>
                  {formatMessage({
                    id: "page.verifyEmail.success",
                    defaultMessage: "Your email address has been verified. You can now sign in.",
                  })}
                </StatusCopy>
                {dest && signedIn ? (
                  <a href={dest} className="text-body-medium text-text-primary underline underline-offset-2">
                    {formatMessage({ id: "page.verifyEmail.continue", defaultMessage: "Continue" })}
                  </a>
                ) : dest ? (
                  <Link
                    to={routes.login}
                    search={{ next: dest }}
                    className="text-body-medium text-text-primary underline underline-offset-2"
                  >
                    {formatMessage({ id: "page.verifyEmail.goToSignIn", defaultMessage: "Go to sign in" })}
                  </Link>
                ) : (
                  <Link
                    to={routes.login}
                    className="text-body-medium text-text-primary underline underline-offset-2"
                  >
                    {formatMessage({ id: "page.verifyEmail.goToSignIn", defaultMessage: "Go to sign in" })}
                  </Link>
                )}
              </>
            ) : (
              <>
                <StatusCopy>
                  {formatMessage({
                    id: "page.verifyEmail.failure",
                    defaultMessage: "This verification link is invalid or has expired.",
                  })}
                </StatusCopy>
                <Link
                  to={routes.verifyPending}
                  className="text-body-medium text-text-primary underline underline-offset-2"
                >
                  {formatMessage({ id: "page.verifyEmail.requestNewLink", defaultMessage: "Request a new link" })}
                </Link>
              </>
            )}
          </FramePanel>
        </Frame>
      </div>
    </main>
  );
}
