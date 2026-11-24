import { safeReturnPath } from "@mtt/contracts/site";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { parseAsString, useQueryState } from "nuqs";
import { type ReactElement, useEffect } from "react";
import { useIntl } from "react-intl";
import { AuthPage } from "@/features/auth/ui/auth-page";
import { AuthCard } from "@/features/auth/ui/auth-card";
import { authLinkClass } from "@/features/auth/ui/auth-link-class";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";
import { goToReturnPath, isOwnerSession } from "@/features/auth/session";
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
    enabled: verify.isSuccess && Boolean(dest),
  });
  const signedIn = Boolean(dest) && isOwnerSession(me);

  useEffect(() => {
    if (signedIn && dest) goToReturnPath(dest);
  }, [signedIn, dest]);

  const goToSignIn = (
    <Link to={routes.login} search={dest ? { next: dest } : undefined} className={authLinkClass}>
      {formatMessage({ id: "page.verifyEmail.goToSignIn", defaultMessage: "Go to sign in" })}
    </Link>
  );

  return (
    <AuthPage bare>
      <AuthCard title={formatMessage({ id: "page.verifyEmail.title", defaultMessage: "Email verification" })}>
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
              <a href={dest} className={authLinkClass}>
                {formatMessage({ id: "page.verifyEmail.continue", defaultMessage: "Continue" })}
              </a>
            ) : (
              goToSignIn
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
            <Link to={routes.verifyPending} className={authLinkClass}>
              {formatMessage({ id: "page.verifyEmail.requestNewLink", defaultMessage: "Request a new link" })}
            </Link>
          </>
        )}
      </AuthCard>
    </AuthPage>
  );
}
