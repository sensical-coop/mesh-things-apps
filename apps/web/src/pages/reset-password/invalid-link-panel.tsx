import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { AuthCard } from "@/features/auth/ui/auth-card";
import { authLinkClass } from "@/features/auth/ui/auth-link-class";
import { routes } from "@/router";

export function InvalidLinkPanel(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <AuthCard
      title={formatMessage({ id: "page.resetPassword.invalidLink.title", defaultMessage: "Invalid link" })}
      subtitle={formatMessage({
        id: "page.resetPassword.invalidLink.body",
        defaultMessage: "This password reset link is invalid or has expired.",
      })}
    >
      <Link to={routes.forgotPassword} className={authLinkClass}>
        {formatMessage({ id: "page.resetPassword.invalidLink.requestNew", defaultMessage: "Request a new link" })}
      </Link>
    </AuthCard>
  );
}
