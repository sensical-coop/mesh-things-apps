import { Frame, FramePanel } from "@mtt/ui/reui/frame";
import { LoginForm as UiLoginForm } from "@mtt/ui/forms/login-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactElement, type ReactNode, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { safeReturnPath } from "@/lib/return-path";
import { routes } from "@/router";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";
import { readApiError } from "@mtt/contracts/errors";

const MOCK_API_DISABLED = import.meta.env.VITE_DISABLE_MOCK_API === "true";

type FormatMessage = ReturnType<typeof useIntl>["formatMessage"];

function loginErrorMessage(status: number | undefined, formatMessage: FormatMessage): string {
  if (status === 401) {
    return formatMessage({
      id: "page.login.form.error",
      defaultMessage: "Those credentials were not accepted. Check the email and password and try again.",
    });
  }
  if (status === 429) {
    return formatMessage({
      id: "page.login.form.error.throttled",
      defaultMessage: "Too many sign-in attempts. Wait a minute and try again.",
    });
  }
  return formatMessage({
    id: "page.login.form.error.generic",
    defaultMessage: "We couldn't sign you in right now. Try again in a moment.",
  });
}

export function LoginForm({
  accountDeleted = false,
  next,
}: {
  accountDeleted?: boolean;
  next?: string;
}): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const login = useMutation({
    ...authRepository.login(),
    // An unverified owner is signed in too, and only has the verify-pending page.
    onSuccess: async (owner) => {
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
      if (!owner.is_active) {
        await navigate({ to: routes.verifyPending });
        return;
      }
      const dest = safeReturnPath(next) ?? routes.meshes;
      if (dest === routes.meshes) await navigate({ to: routes.meshes });
      else window.location.assign(dest);
    },
  });

  async function onSubmit(values: { email: string; password: string }) {
    setError(null);
    try {
      await authRepository.csrf();
      await login.mutateAsync({ data: values });
    } catch (caught) {
      setError(loginErrorMessage(readApiError(caught).status, formatMessage));
    }
  }

  return (
    <Frame className="w-full shadow-card" spacing="lg">
      <FramePanel className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-2-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.login.form.title", defaultMessage: "Welcome back" })}
          </h1>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.login.form.subtitle",
              defaultMessage: "Sign in with the email on your owner account.",
            })}
          </p>
        </div>
        {accountDeleted ? (
          <StatusCopy className="text-accent-500">
            {formatMessage({
              id: "page.login.form.accountDeleted",
              defaultMessage: "Your account has been deleted.",
            })}
          </StatusCopy>
        ) : null}
        <UiLoginForm
          labels={{
            email: formatMessage({ id: "page.login.form.email", defaultMessage: "Email" }),
            password: formatMessage({ id: "page.login.form.password", defaultMessage: "Password" }),
            submit: formatMessage({ id: "page.login.form.signIn", defaultMessage: "Sign in" }),
            pending: formatMessage({ id: "page.login.form.signingIn", defaultMessage: "Signing in" }),
          }}
          error={error}
          pending={login.isPending}
          defaultValues={
            MOCK_API_DISABLED ? undefined : { email: "owner@sensical.test", password: "mesh-owner-12" }
          }
          forgotPassword={
            <Link
              to={routes.forgotPassword}
              className="self-end text-caption-1-regular text-text-secondary underline underline-offset-2"
            >
              {formatMessage({ id: "page.login.form.forgotPassword", defaultMessage: "Forgot password?" })}
            </Link>
          }
          onSubmit={(values) => void onSubmit(values)}
          footer={
            <>
              {MOCK_API_DISABLED ? null : (
                <p className="text-caption-1-regular text-text-tertiary">
                  {formatMessage({
                    id: "page.login.form.mockAccounts",
                    defaultMessage:
                      "Mock accounts: owner@sensical.test (Hill), river@sensical.test (River), admin@sensical.test (all meshes), staff@sensical.test (read, no PSK). Password mesh-owner-12, except admin mesh-admin-12 and staff mesh-staff-12.",
                  })}
                </p>
              )}
              <p className="text-caption-1-regular text-text-tertiary">
                <FormattedMessage
                  id="page.login.form.noAccount"
                  defaultMessage="Don't have an account? <link>Sign up</link>."
                  values={{
                    link: (chunks: ReactNode) => (
                      <Link to={routes.signup} className="text-accent-500 underline underline-offset-2">
                        {chunks}
                      </Link>
                    ),
                  }}
                />
              </p>
            </>
          }
        />
      </FramePanel>
    </Frame>
  );
}
