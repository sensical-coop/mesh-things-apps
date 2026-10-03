import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FramePanel } from "@mtt/ui/reui/frame";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { type FormEvent, type ReactElement, type ReactNode, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { FormField } from "@/components/form/form-field";
import { Input } from "@mtt/ui/components/ui/input";
import { routes } from "@/router";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";
import { readApiError } from "@/lib/api-errors";

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

export function LoginForm(): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { accountDeleted } = useSearch({ from: routes.login });
  const [error, setError] = useState<string | null>(null);
  const login = useMutation({
    ...authRepository.login(),
    // An unverified owner is signed in too, and only has the verify-pending page.
    onSuccess: async (owner) => {
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
      await navigate({ to: owner.is_active ? routes.meshes : routes.verifyPending });
    },
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await authRepository.csrf();
      await login.mutateAsync({
        body: {
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        },
      });
    } catch (caught) {
      setError(loginErrorMessage(readApiError(caught).status, formatMessage));
    }
  }

  return (
    <Frame className="shadow-card w-full" spacing="lg">
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
        <form className="flex flex-col gap-5" onSubmit={(e) => void onSubmit(e)}>
          <FieldGroup>
            <FormField
              id="login-email"
              label={formatMessage({ id: "page.login.form.email", defaultMessage: "Email" })}
            >
              <Input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="username"
                defaultValue={MOCK_API_DISABLED ? undefined : "owner@sensical.test"}
              />
            </FormField>
            <FormField
              id="login-password"
              label={formatMessage({ id: "page.login.form.password", defaultMessage: "Password" })}
            >
              <Input
                id="login-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                defaultValue={MOCK_API_DISABLED ? undefined : "mesh-owner-12"}
              />
            </FormField>
          </FieldGroup>
          <Link
            to={routes.forgotPassword}
            className="self-end text-caption-1-regular text-text-secondary underline underline-offset-2"
          >
            {formatMessage({ id: "page.login.form.forgotPassword", defaultMessage: "Forgot password?" })}
          </Link>
          {error ? <StatusCopy>{error}</StatusCopy> : null}
          <Button type="submit" size="small" disabled={login.isPending} className="mt-1">
            {login.isPending
              ? formatMessage({ id: "page.login.form.signingIn", defaultMessage: "Signing in" })
              : formatMessage({ id: "page.login.form.signIn", defaultMessage: "Sign in" })}
          </Button>
        </form>
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
                <Link to={routes.signup} className="underline underline-offset-2 text-accent-500">
                  {chunks}
                </Link>
              ),
            }}
          />
        </p>
      </FramePanel>
    </Frame>
  );
}
