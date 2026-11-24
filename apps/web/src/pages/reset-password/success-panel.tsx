import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { AuthCard } from "@/features/auth/ui/auth-card";
import { authLinkClass } from "@/features/auth/ui/auth-link-class";
import { routes } from "@/router";

export function SuccessPanel(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <AuthCard
      title={formatMessage({ id: "page.resetPassword.success.title", defaultMessage: "Password updated" })}
      subtitle={formatMessage({
        id: "page.resetPassword.success.body",
        defaultMessage: "Your password has been changed. Sign in with your new password.",
      })}
    >
      <Link to={routes.login} className={authLinkClass}>
        {formatMessage({ id: "page.resetPassword.success.goToSignIn", defaultMessage: "Go to sign in" })}
      </Link>
    </AuthCard>
  );
}
