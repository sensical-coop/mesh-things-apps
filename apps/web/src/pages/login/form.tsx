import { MOCK_ACCOUNTS } from "@mtt/contracts/mock-accounts";
import { MOCK_API } from "@mtt/contracts/runtime";
import { useLogin } from "@mtt/contracts/session";
import { forgotPasswordLinkClass, LoginForm as UiLoginForm } from "@mtt/ui/forms/login-form";
import { Link } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { StatusCopy } from "@/components/status-copy";
import { inlineLinkClass } from "@/lib/link-class";
import { AuthCard } from "@/features/auth/ui/auth-card";
import { routes } from "@/router";

/** Signing in refreshes `me`, and the guest page around this form then redirects to wherever the session belongs. */
export function LoginForm({ accountDeleted = false }: { accountDeleted?: boolean }): ReactElement {
  const { formatMessage } = useIntl();
  const { failure, pending, submit } = useLogin();

  return (
    <AuthCard
      title={formatMessage({ id: "page.login.form.title", defaultMessage: "Welcome back" })}
      subtitle={formatMessage({
        id: "page.login.form.subtitle",
        defaultMessage: "Sign in with the email on your owner account.",
      })}
    >
      {accountDeleted ? (
        <StatusCopy className="text-accent-500">
          {formatMessage({
            id: "page.login.form.accountDeleted",
            defaultMessage: "Your account has been deleted.",
          })}
        </StatusCopy>
      ) : null}
      <UiLoginForm
        failure={failure}
        pending={pending}
        defaults={MOCK_API ? MOCK_ACCOUNTS[0] : undefined}
        forgotPassword={
          <Link to={routes.forgotPassword} className={forgotPasswordLinkClass}>
            {formatMessage({ id: "page.login.form.forgotPassword", defaultMessage: "Forgot password?" })}
          </Link>
        }
        onSubmit={(values) => void submit(values)}
        footer={
          <>
            {MOCK_API ? (
              <div className="flex flex-col gap-1 text-caption-1-regular text-text-tertiary">
                <p>{formatMessage({ id: "page.login.form.mockAccounts.title", defaultMessage: "Mock accounts" })}</p>
                <ul>
                  {MOCK_ACCOUNTS.map((account) => (
                    <li key={account.key}>
                      {account.email} · {account.password}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-caption-1-regular text-text-tertiary">
              <FormattedMessage
                id="page.login.form.noAccount"
                defaultMessage="Don't have an account? <link>Sign up</link>."
                values={{
                  link: (chunks: ReactNode) => (
                    <Link to={routes.signup} className={inlineLinkClass}>
                      {chunks}
                    </Link>
                  ),
                }}
              />
            </p>
          </>
        }
      />
    </AuthCard>
  );
}
