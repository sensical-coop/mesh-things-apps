import { useLogin } from "@mtt/contracts/session";
import { MOCK_ACCOUNTS } from "@mtt/contracts/mock-accounts";
import { MOCK_API } from "@mtt/contracts/runtime";
import { SITE_PATHS } from "@mtt/contracts/site";
import { forgotPasswordLinkClass, LoginForm as UiLoginForm } from "@mtt/ui/forms/login-form";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export function LoginForm(): ReactElement {
  const { formatMessage } = useIntl();
  const { failure, pending, submit } = useLogin();

  return (
    <UiLoginForm
      failure={failure}
      pending={pending}
      defaults={MOCK_API ? MOCK_ACCOUNTS[0] : undefined}
      forgotPassword={
        <a className={forgotPasswordLinkClass} href={SITE_PATHS.forgotPassword}>
          {formatMessage({ id: "page.login.form.forgotPassword", defaultMessage: "Forgot password?" })}
        </a>
      }
      onSubmit={(values) => void submit(values)}
    />
  );
}
