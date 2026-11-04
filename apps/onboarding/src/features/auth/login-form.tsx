import { readApiError } from "@mtt/contracts/errors";
import { LoginForm as UiLoginForm } from "@mtt/ui/forms/login-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { authRepository } from "@/features/auth/repository";

const MOCK_API_DISABLED = import.meta.env.VITE_DISABLE_MOCK_API === "true";

export function LoginForm(): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const login = useMutation({
    ...authRepository.login(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
    },
  });

  async function onSubmit(values: { email: string; password: string }) {
    setError(null);
    try {
      await authRepository.csrf();
      await login.mutateAsync({ data: values });
    } catch (caught) {
      const status = readApiError(caught).status;
      setError(
        status === 401
          ? formatMessage({
              id: "page.login.form.error",
              defaultMessage: "Those credentials were not accepted. Check the email and password and try again.",
            })
          : status === 429
            ? formatMessage({
                id: "page.login.form.error.throttled",
                defaultMessage: "Too many sign-in attempts. Wait a minute and try again.",
              })
            : formatMessage({
                id: "page.login.form.error.generic",
                defaultMessage: "We couldn't sign you in right now. Try again in a moment.",
              }),
      );
    }
  }

  return (
    <UiLoginForm
      labels={{
        email: formatMessage({ id: "page.login.form.email", defaultMessage: "Email" }),
        password: formatMessage({ id: "page.login.form.password", defaultMessage: "Password" }),
        submit: formatMessage({ id: "page.login.form.signIn", defaultMessage: "Sign in" }),
        pending: formatMessage({ id: "page.login.form.signingIn", defaultMessage: "Signing in" }),
      }}
      error={error}
      pending={login.isPending}
      defaultValues={MOCK_API_DISABLED ? undefined : { email: "owner@sensical.test", password: "mesh-owner-12" }}
      forgotPassword={
        <a className="self-end text-caption-1-regular text-text-secondary underline underline-offset-2" href="/forgot-password">
          {formatMessage({ id: "page.login.form.forgotPassword", defaultMessage: "Forgot password?" })}
        </a>
      }
      onSubmit={(values) => void onSubmit(values)}
    />
  );
}
