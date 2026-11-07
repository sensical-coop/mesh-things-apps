import { classifyLoginFailure, type LoginFailure } from "@mtt/contracts/errors";
import { LoginForm as UiLoginForm } from "@mtt/ui/forms/login-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { authRepository } from "@/features/auth/repository";

export function LoginForm(): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const login = useMutation({
    ...authRepository.login(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
    },
  });

  async function onSubmit(values: { email: string; password: string }) {
    setFailure(null);
    try {
      await login.mutateAsync({ data: values });
    } catch (caught) {
      setFailure(classifyLoginFailure(caught));
    }
  }

  return (
    <UiLoginForm
      failure={failure}
      pending={login.isPending}
      forgotPassword={
        <a className="self-end text-caption-1-regular text-text-secondary underline underline-offset-2" href="/forgot-password">
          {formatMessage({ id: "page.login.form.forgotPassword", defaultMessage: "Forgot password?" })}
        </a>
      }
      onSubmit={(values) => void onSubmit(values)}
    />
  );
}
